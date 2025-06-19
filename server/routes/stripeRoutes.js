// HEXY.PRO Express Server - /server/routes/stripeRoutes.js - Express route for handling Stripe payments.
// Do not remove any comments in this file, including the one above.

require("dotenv").config();
const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    console.error("No token provided");
    return res.sendStatus(401);
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Error fetching user with token:", error);
      throw error;
    }
    if (!data.user) {
      console.error("No user found with token");
      return res.sendStatus(403);
    }
    req.user = data.user;
    next();
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return res.sendStatus(403);
  }
};

router.post(
  "/api/stripe/create-payment-link",
  authenticateToken,
  async (req, res) => {
    const { productId } = req.body;
    const { user } = req;

    const { data: existingPurchases, error: purchaseCheckError } =
      await supabase
        .from("purchases")
        .select("payment_link")
        .eq("user_uuid", user.id)
        .eq("product_id", productId)
        .eq("payment_status", "pending")
        .eq("processing_status", "pending");

    if (purchaseCheckError) {
      console.error("Error checking existing purchases:", purchaseCheckError);
      return res.status(500).json({
        status: "error",
        message: "Error checking existing purchases",
      });
    }

    if (existingPurchases.length > 0) {
      return res.json({
        status: "ok",
        payment_link: existingPurchases[0].payment_link,
      });
    }

    const TempTokenAccount = generateTemporaryToken();

    const customer = await stripe.customers.create({
      id: TempTokenAccount,
    });

    const result = await createOneTimeInvoice(customer.id, productId);

    if (result.status === "ok") {
      const { hosted_invoice_url, invoice_id } = result;

      const { error: insertError } = await supabase.from("purchases").insert([
        {
          user_uuid: user.id,
          payment_link: hosted_invoice_url,
          product_id: productId,
          payment_status: "pending",
          processing_status: "pending",
          processing_time: null,
          invoice_id: invoice_id,
        },
      ]);

      if (insertError) {
        console.error("Error inserting purchase:", insertError);
        return res
          .status(500)
          .json({ status: "error", message: "Error inserting purchase" });
      }

      res.json({ status: "ok", payment_link: hosted_invoice_url });
    } else {
      res.status(500).json(result);
    }
  }
);

async function createOneTimeInvoice(customerId, productId) {
  try {
    let product, price, invoice;

    let { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("available", "FALSE");

    if (productsError) {
      return {
        status: "error",
        message: productsError,
      };
    }

    if (products.length == 0) {
      return {
        status: "error",
        message: "Error, no products available",
      };
    }

    product = await stripe.products.create({
      name: products[0].name,
      description: products[0].description,
    });

    price = await stripe.prices.create({
      unit_amount: products[0].price,
      currency: "cad",
      product: product.id,
    });

    invoice = await stripe.invoices.create({
      customer: customerId,
      description: "Purchasing a product #" + productId,
    });

    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      price: price.id,
      invoice: invoice.id,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
      auto_advance: false,
    });

    return {
      status: "ok",
      hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
      invoice_id: invoice.id,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: error,
    };
  }
}

function generateTemporaryToken() {
  const tokenLength = 8;
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let token = "";
  for (let i = 0; i < tokenLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }

  return token;
}

const processingOfPaidPayments = async () => {
  try {
    // Fetch purchases with payment_status = pending and processing_status = pending
    const { data: pendingPurchases, error: fetchError } = await supabase
      .from('purchases')
      .select('*')
      .eq('payment_status', 'pending')
      .eq('processing_status', 'pending');

    if (fetchError) {
      console.error('Error fetching pending purchases:', fetchError);
      return;
    }

    for (const purchase of pendingPurchases) {
      try {
        if (!purchase.invoice_id) {
          console.error(`Invoice ID missing for purchase ${purchase.id}`);
          continue;
        }

        const invoice = await stripe.invoices.retrieve(purchase.invoice_id);
        if (invoice.paid) {
          // Update user's tier and add tokens
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('tier, tokens')
            .eq('id', purchase.user_uuid)
            .single();

          if (userError) {
            throw userError;
          }

          let newTier = 'Free';
          let tokensToAdd = 0;

          // Determine new tier and tokens based on the product
          if (purchase.product_id === 1) {  // Assuming product_id 1 is for Pro tier
            newTier = 'Pro';
            tokensToAdd = 1000;  // Add 1000 tokens for testing
          } else if (purchase.product_id === 3) {  // Assuming product_id 3 is for Supporter tier
            newTier = 'Supporter';
            tokensToAdd = 2000;  // Add 2000 tokens for Supporter tier
          }

          // Update user's profile with new tier and tokens
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              tier: newTier, 
              tokens: (userData.tokens || 0) + tokensToAdd 
            })
            .eq('id', purchase.user_uuid);

          if (updateError) {
            throw updateError;
          }

          // Update purchase status
          await supabase
            .from('purchases')
            .update({
              processing_status: 'completed',
              processing_time: new Date().toISOString(),
            })
            .eq('id', purchase.id);

          console.log(`Purchase processed for user ${purchase.user_uuid}. New tier: ${newTier}, Tokens added: ${tokensToAdd}`);
        } else {
          await supabase
            .from('purchases')
            .update({ processing_status: 'pending' })
            .eq('id', purchase.id);
        }
      } catch (error) {
        console.error(
          `Error processing purchase ${purchase.id}, reverting to pending:`,
          error
        );

        await supabase
          .from('purchases')
          .update({ processing_status: 'pending' })
          .eq('id', purchase.id);
      }
    }
  } catch (error) {
    console.error('Error processingOfPaidPayments:', error);
  }
};

cron.schedule("*/7 * * * * *", () => {
  processingOfPaidPayments();
});

module.exports = router;
