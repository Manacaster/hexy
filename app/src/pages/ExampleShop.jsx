// HEXY.PRO App - /app/src/pages/ExampleShop.jsx - Page component used to display a list of products and open a payment link.
 

/* eslint-disable no-undef */
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const ExampleShop = () => {
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line no-unused-vars
    const [paymentLink, setPaymentLink] = useState("");

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!session) throw new Error('User is not authenticated');

                const token = session.access_token;
                const response = await fetch('http://localhost:5000/api/stripe/create-payment-link', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ productId: 1 })
                });

                const data = await response.json();

                if (data.status === "error") {
                    console.log(data.message);
                    return;
                } else {
                    window.open(data.payment_link, '_blank');
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Products</h1>
            <ul>
                {products.map((product) => (
                    <li key={product.id}>{product.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default ExampleShop;