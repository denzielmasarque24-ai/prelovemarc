# Rosette Boutique Capstone

Rosette Boutique is a pastel pink clothing shop built with Next.js App Router, TypeScript, TSX, and CSS. It includes a landing page, signup and login flow using `localStorage`, a product catalog, category filters, a cart system, and boutique-style responsive pages for about and contact.

## Tech Stack

- Next.js 16 with App Router
- React 19
- TypeScript and TSX
- CSS with a soft pastel boutique theme
- `localStorage` for users, session, and cart data

## Project Structure

```text
/
|-- app/
|-- components/
|-- lib/
|-- public/
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- next.config.ts
|-- eslint.config.mjs
|-- postcss.config.mjs
|-- README.md
```

## Installation

```bash
npm install
```

## Run The Project

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Main Features

- Landing page with login and sign-up navigation
- Sign up and login using `localStorage`
- Session handling and logout
- Responsive boutique-style homepage
- Product cards with local images
- Search and category filtering
- Add to cart, remove from cart, total price, and checkout alert
- About and contact pages with clean pastel styling
- Vercel-ready Next.js project structure at the repository root

## Deployment

This project is ready for Vercel deployment.

- Framework preset: `Next.js`
- Root directory: repository root
- Build command: `npm run build`
- Install command: `npm install`

## Notes

- Product images are stored in `public/images/`.
- Cart data, registered users, and session data are saved in browser `localStorage`.
