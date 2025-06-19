# HEXY.PRO - The Open-Source Hexagonal Map Creator

![HEXY.PRO Screenshot](/banner.png)

Welcome to **HEXY.PRO**, a powerful and intuitive hexagonal map creator designed for world-builders, game developers, and TTRPG masters. What started as a commercial project has now been reborn for the community. We've gone open-source to empower creators everywhere, and we're inviting you to help us shape its future!

Our decision to open-source means that some of our most ambitious, server-side features have been temporarily disabled. We see this not as a setback, but as a **massive opportunity** for the open-source community to step in, innovate, and build something incredible together.

---

## ✨ Core Features (Fully Functional!)

- **Dynamic Hex Grid Generation:** Create maps of any size and shape, including hexagons, squares, and circles.
- **Procedural Terrain Generation:** Use powerful noise controls (Simplex, Perlin) to generate natural-looking terrain with adjustable height and scale.
- **Advanced Biome Control:** Fine-tune biome distribution with weighted controls, allowing you to craft diverse and believable worlds.
- **Rich Map Editing:** Paint tiles directly onto the grid, add and remove objects like trees and structures, and rotate tiles to perfection.
- **Save & Load Your Maps:** Authenticated users can save their creations to the cloud and load them back up anytime, powered by Supabase.
- **Custom Tile Collections:** Upload and manage your own custom tile sets to bring your unique artistic vision to life.
- **Interactive 3D Camera:** Explore your creations from any angle with both orthographic and perspective camera modes.

---

## 🛠 The Tech Stack

HEXY.PRO is built on a modern and powerful stack, chosen for its flexibility and performance.

- **Frontend:** **React** & **Vite** for a blazing-fast development experience.
- **3D Rendering:** **Three.js** and **React Three Fiber** for efficient and beautiful 3D graphics in the browser.
- **Backend & Database:** **Supabase** handles authentication, database storage, and file management, providing a seamless backend-as-a-service.
- **Styling:** Plain ol' CSS for lightweight and targeted styling.

---

## 🔓 The Open-Source Opportunity: Help Us Rebuild!

When we decided to open-source HEXY.PRO, we had to disable our core commercial, server-side features. The code and workflows are still in the repository, waiting for talented developers to revive them in a new, open way.

Here's what's currently offline and where you can make a huge impact:

### 🤖 AI-Powered Tile Generation (Currently Disabled)

This was our flagship feature: a self-hosted image generation pipeline that allowed users to create unique tiles on the fly.

-   **The Goal:** Allow users to generate tile assets using descriptive prompts (e.g., "a lush forest tile with a small stream").
-   **Original Implementation:** Used a **ComfyUI** workflow with **Stable Diffusion** to generate images. An **Ollama-powered LLM** was being integrated to help translate user prompts into effective generation parameters.
-   **Current Status:** The backend services for this are offline. The workflows and some server code are still present in the `/comfyapi/` and `/server/` directories. This is a perfect opportunity to reintegrate these services or architect a new, community-hosted solution.

### 💳 Stripe Subscription Integration (Currently Disabled)

The AI generation features were supported by a subscription model.

-   **The Goal:** Manage user subscriptions for premium features.
-   **Original Implementation:** Used **Stripe** for handling payments and managing user tiers.
-   **Current Status:** The routes and logic in `/server/routes/stripeRoutes.js` are disabled. This could be repurposed for community-based support models (donations, etc.) or other creative uses.

---

## 🚀 Getting Started

Ready to jump in? Here's how to get the development environment running.

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Manacaster/hexy.git
    cd hexy/app
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Supabase:**
    -   Go to [Supabase.com](https://supabase.com/) and create a new project.
    -   In the root of the `/app` folder, create a new file named `.env`.
    -   Find your project's API URL and `anon` key in your Supabase project's "API Settings".
    -   Add them to your `.env` file:
        ```
        VITE_SUPABASE_URL=YOUR_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    -   Run the SQL queries provided in the `supabase_setup` directory to create the necessary tables and policies. *(Note: We will be adding these files in a future commit.)*

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

The application should now be running on your local machine!

---

## 🤝 Contributing

We are incredibly excited to see what the community builds. Whether you're interested in tackling the AI generation pipeline, improving the UI, fixing bugs, or adding new features, all contributions are welcome.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/your-amazing-feature`).
5.  Open a Pull Request!

Let's build the ultimate map-making tool, together.
