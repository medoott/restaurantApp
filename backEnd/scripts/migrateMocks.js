import connectedDB from "../src/DB/connection.js";
import Product from "../src/DB/model/Product.model.js";
import Order from "../src/DB/model/Order.model.js";
import mongoose from "mongoose";

// fallback DB URL if .env not loaded in this script
process.env.DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/coffe";

const PRODUCTS = [
  {
    id: 1,
    name: "Velvet Espresso",
    category: "Coffee",
    price: 3.5,
    desc: "Double shot, dark crema, no compromise.",
    img: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Caramel Cortado",
    category: "Coffee",
    price: 4.25,
    desc: "Equal parts espresso and steamed milk.",
    img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Hazelnut Latte",
    category: "Coffee",
    price: 4.75,
    desc: "Silky milk, roasted hazelnut warmth.",
    img: "https://images.unsplash.com/photo-1568649929103-28ffbefaca1f?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Single-Origin Pour Over",
    category: "Coffee",
    price: 5.0,
    desc: "Bright, clean, brewed to order.",
    img: "https://images.unsplash.com/photo-1495774856032-8b90bbb32b32?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Moroccan Mint Tea",
    category: "Tea",
    price: 3.25,
    desc: "Fresh mint, green tea, lightly sweet.",
    img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Chamomile Bloom",
    category: "Tea",
    price: 3.0,
    desc: "Calming chamomile with honey notes.",
    img: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 7,
    name: "Earl Grey Royale",
    category: "Tea",
    price: 3.5,
    desc: "Bergamot-laced black tea, classic cup.",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 8,
    name: "Iced Caramel Macchiato",
    category: "Cold Drinks",
    price: 4.95,
    desc: "Layered espresso over cold milk and caramel.",
    img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 9,
    name: "Cold Brew Reserve",
    category: "Cold Drinks",
    price: 4.5,
    desc: "Steeped eighteen hours, smooth and bold.",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 10,
    name: "Berry Hibiscus Cooler",
    category: "Cold Drinks",
    price: 4.0,
    desc: "Tart hibiscus, mixed berry, sparkling finish.",
    img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 11,
    name: "Basque Burnt Cheesecake",
    category: "Desserts",
    price: 5.5,
    desc: "Caramelized top, molten centre.",
    img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 12,
    name: "Dark Chocolate Tart",
    category: "Desserts",
    price: 5.75,
    desc: "Bittersweet ganache, sablé crust.",
    img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 13,
    name: "Pistachio Croissant",
    category: "Desserts",
    price: 4.25,
    desc: "Buttery layers, pistachio cream filling.",
    img: "https://images.unsplash.com/photo-1623334044303-241021148842?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 14,
    name: "Smoked Turkey Brie",
    category: "Sandwiches",
    price: 7.5,
    desc: "Brie, fig jam, arugula on sourdough.",
    img: "https://images.unsplash.com/photo-1481070555726-e2fe8357725c?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 15,
    name: "Grilled Halloumi Wrap",
    category: "Sandwiches",
    price: 6.95,
    desc: "Charred halloumi, roasted peppers, herb yogurt.",
    img: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 16,
    name: "Classic Club",
    category: "Sandwiches",
    price: 7.25,
    desc: "Triple-stacked, smoked bacon, fresh basil mayo.",
    img: "https://images.unsplash.com/photo-1567234669003-dce7a7305214?q=80&w=600&auto=format&fit=crop",
  },
];

const ORDERS = [  
  {
    id: "ORD-1042",
    customer: "Mohamed",
    code: 444,
    items: 3,
    payment: "Cash",
    total: 14.5,
    status: "Pending",
  },
  {
    id: "ORD-1041",
    customer: "Sara Ahmed",
    code: 219,
    items: 2,
    payment: "Online",
    total: 9.75,
    status: "Preparing",
  },
  {
    id: "ORD-1040",
    customer: "Youssef Adel",
    code: 803,
    items: 5,
    payment: "Online",
    total: 27.4,
    status: "Ready",
  },
  {
    id: "ORD-1039",
    customer: "Layla Hassan",
    code: 156,
    items: 1,
    payment: "Cash",
    total: 4.25,
    status: "Delivered",
  },
  {
    id: "ORD-1038",
    customer: "Omar Tarek",
    code: 392,
    items: 4,
    payment: "Online",
    total: 19.0,
    status: "Cancelled",
  },
  {
    id: "ORD-1037",
    customer: "Nour Khaled",
    code: 671,
    items: 2,
    payment: "Cash",
    total: 8.5,
    status: "Delivered",
  },
];

async function migrate() {
  try {
    await connectedDB();
    let pCount = 0;
    for (const p of PRODUCTS) {
      const doc = {
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price) || 0,
        desc: p.desc || "",
        img: p.img || "",
      };
      const res = await Product.updateOne(
        { id: doc.id },
        { $set: doc },
        { upsert: true },
      );
      if (res.upsertedCount || res.modifiedCount) pCount++;
    }

    let oCount = 0;
    for (const o of ORDERS) {
      const doc = {
        id: String(o.id),
        customer: o.customer || "",
        code: Number(o.code) || 0,
        items: Number(o.items) || 0,
        itemsDetail: o.itemsDetail || [],
        payment: o.payment || "Cash",
        total: Number(o.total) || 0,
        status: o.status || "Pending",
      };
      const res = await Order.updateOne(
        { id: doc.id },
        { $set: doc },
        { upsert: true },
      );
      if (res.upsertedCount || res.modifiedCount) oCount++;
    }

    console.log(
      `Migration complete. Products touched: ${pCount}, Orders touched: ${oCount}`,
    );
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
