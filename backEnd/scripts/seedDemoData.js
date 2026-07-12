import "dotenv/config";
import mongoose from "mongoose";
import connectedDB from "../src/DB/connection.js";
import Branch from "../src/DB/model/Branch.model.js";
import Role from "../src/DB/model/Role.model.js";
import User from "../src/DB/model/User.model.js";
import Table from "../src/DB/model/Table.model.js";
import Product from "../src/DB/model/Product.model.js";
import InventoryItem from "../src/DB/model/InventoryItem.model.js";
import Supplier from "../src/DB/model/Supplier.model.js";
import Recipe from "../src/DB/model/Recipe.model.js";
import CustomerProfile from "../src/DB/model/CustomerProfile.model.js";
import Reservation from "../src/DB/model/Reservation.model.js";
import Visit from "../src/DB/model/Visit.model.js";
import Order from "../src/DB/model/Order.model.js";
import PaymentSession from "../src/DB/model/PaymentSession.model.js";
import WaiterRequest from "../src/DB/model/WaiterRequest.model.js";
import Notification from "../src/DB/model/Notification.model.js";
import AuditLog from "../src/DB/model/AuditLog.model.js";
import Settings from "../src/DB/model/Settings.model.js";
import PurchaseOrder from "../src/DB/model/PurchaseOrder.model.js";

process.env.DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/coffe";

const DEMO_PASSWORD = "Welcome123!";

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();

const makeDate = (daysAgo, hoursOffset = 0) => new Date(now.getTime() - daysAgo * dayMs + hoursOffset * 60 * 60 * 1000);
const futureDate = (daysAhead, hoursOffset = 0) => new Date(now.getTime() + daysAhead * dayMs + hoursOffset * 60 * 60 * 1000);

const firstNames = ["Amina", "Omar", "Lina", "Youssef", "Nadia", "Khaled", "Rania", "Samir", "Hana", "Mina", "Malak", "Adel", "Sara", "Noor", "Tarek", "Maya", "Rami", "Dina", "Hassan", "Farah", "Mouad", "Salma", "Karim", "Layla", "Bilal", "Sahar", "Amir", "Leila", "Nour", "Fadi", "Rita"];
const lastNames = ["Hassan", "Khalil", "Mansour", "Ibrahim", "El-Tayeb", "Abdelrahman", "Farid", "Nasser", "Soliman", "Gaber", "Sayed", "Yousef", "Hamed", "Badr", "Mourad", "Amin", "Saeed", "Barakat", "Rafaat", "Karout", "Nasr", "Abdallah", "Hanna", "Kamel", "Dawoud", "Awad"];
const streetNames = ["Cedar Avenue", "Magnolia Road", "Harbor Street", "River Walk", "Pine Court", "Elm Lane", "Market Square", "Old Town Road", "Orchard Avenue", "Crown Street"];

const branchSeed = [
  { name: "Brúne Harbor Street", code: "HS", address: "142 Harbor Street, Downtown", phone: "+1 212 555 0148", isActive: true },
  { name: "Brúne Riverside", code: "RS", address: "88 Riverside Avenue, West End", phone: "+1 212 555 0164", isActive: true },
];

const roleSeed = [
  { name: "owner", label: "Owner", description: "Full access to restaurant operations", permissions: ["all"], isSystem: true, priority: 100 },
  { name: "manager", label: "Manager", description: "Operational oversight for a branch", permissions: ["orders.read", "orders.write", "inventory.read", "inventory.write", "tables.read", "tables.write", "customers.read", "customers.write", "reports.read", "reservations.read", "reservations.write"], priority: 80 },
  { name: "head_chef", label: "Head Chef", description: "Kitchen leadership and recipe oversight", permissions: ["kitchen.read", "kitchen.write", "inventory.read", "orders.read", "orders.write", "recipes.read", "recipes.write"], priority: 70 },
  { name: "cook", label: "Cook", description: "Production and line execution", permissions: ["kitchen.read", "orders.read", "orders.write"], priority: 60 },
  { name: "waiter", label: "Waiter", description: "Guest service and table operations", permissions: ["tables.read", "orders.read", "orders.write", "requests.read", "requests.write", "reservations.read"], priority: 55 },
  { name: "cashier", label: "Cashier", description: "Payments and checkouts", permissions: ["payments.read", "payments.write", "orders.read", "orders.write", "tables.read"], priority: 50 },
  { name: "inventory_manager", label: "Inventory Manager", description: "Stock control and supplier management", permissions: ["inventory.read", "inventory.write", "suppliers.read", "suppliers.write", "purchase_orders.read", "purchase_orders.write"], priority: 65 },
  { name: "accountant", label: "Accountant", description: "Financial reporting and vendor reconciliation", permissions: ["reports.read", "payments.read", "payments.write", "orders.read", "inventory.read"], priority: 45 },
  { name: "host", label: "Host", description: "Reservations and guest greeting", permissions: ["tables.read", "reservations.read", "reservations.write", "customers.read"], priority: 40 },
  { name: "cleaner", label: "Cleaner", description: "Table and venue hygiene", permissions: ["tables.read", "tables.write"], priority: 35 },
];

const employeeSeed = [
  { name: "Mina Hassan", phone: "+1 212 555 0101", email: "mina.hassan@brune.com", role: "Owner", branchCode: "HS", status: "available", shift: "day" },
  { name: "Daniel Brooks", phone: "+1 212 555 0102", email: "daniel.brooks@brune.com", role: "General Manager", branchCode: "HS", status: "available", shift: "day" },
  { name: "Lina Haddad", phone: "+1 212 555 0103", email: "lina.haddad@brune.com", role: "Branch Manager", branchCode: "RS", status: "available", shift: "day" },
  { name: "Omar Salim", phone: "+1 212 555 0104", email: "omar.salim@brune.com", role: "Cook", branchCode: "HS", status: "busy", shift: "day" },
  { name: "Sofia Alvarez", phone: "+1 212 555 0105", email: "sofia.alvarez@brune.com", role: "Cook", branchCode: "HS", status: "preparing", shift: "day" },
  { name: "Marcus Lee", phone: "+1 212 555 0106", email: "marcus.lee@brune.com", role: "Cook", branchCode: "RS", status: "busy", shift: "evening" },
  { name: "Nadia El-Sayed", phone: "+1 212 555 0107", email: "nadia.elsayed@brune.com", role: "Cook", branchCode: "RS", status: "available", shift: "evening" },
  { name: "Jules Carter", phone: "+1 212 555 0108", email: "jules.carter@brune.com", role: "Order Taker", branchCode: "HS", status: "serving", shift: "day" },
  { name: "Hassan Noor", phone: "+1 212 555 0109", email: "hassan.noor@brune.com", role: "Order Taker", branchCode: "HS", status: "available", shift: "evening" },
  { name: "Maya Rahman", phone: "+1 212 555 0110", email: "maya.rahman@brune.com", role: "Order Taker", branchCode: "RS", status: "serving", shift: "day" },
  { name: "Alicia Zhang", phone: "+1 212 555 0111", email: "alicia.zhang@brune.com", role: "Cashier", branchCode: "HS", status: "busy", shift: "day" },
  { name: "Rami Haddad", phone: "+1 212 555 0112", email: "rami.haddad@brune.com", role: "Cashier", branchCode: "RS", status: "available", shift: "evening" },
  { name: "Iris Chen", phone: "+1 212 555 0113", email: "iris.chen@brune.com", role: "Host", branchCode: "HS", status: "available", shift: "day" },
  { name: "Khaled Fahmy", phone: "+1 212 555 0114", email: "khaled.fahmy@brune.com", role: "Administrator", branchCode: "RS", status: "offline", shift: "day" },
  { name: "Priya Nair", phone: "+1 212 555 0115", email: "priya.nair@brune.com", role: "Administrator", branchCode: "HS", status: "available", shift: "day" },
  { name: "Theo Morgan", phone: "+1 212 555 0116", email: "theo.morgan@brune.com", role: "Cleaner", branchCode: "HS", status: "available", shift: "night" },
  { name: "Nour Haddad", phone: "+1 212 555 0117", email: "nour.haddad@brune.com", role: "Administrator", branchCode: "RS", status: "busy", shift: "day" },
];

const productSeed = [
  { name: "Velvet Espresso", category: "Coffee", price: 3.9, cost: 1.35, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80", desc: "Double shot espresso with a silky crema and caramel finish.", prepTimeMinutes: 5, availability: "available", isPopular: true, isSignature: true },
  { name: "House Cappuccino", category: "Coffee", price: 4.4, cost: 1.65, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80", desc: "Steamed milk, rich espresso, and a dusting of cocoa.", prepTimeMinutes: 6, availability: "available", isPopular: true },
  { name: "Honey Cinnamon Latte", category: "Coffee", price: 4.8, cost: 1.8, img: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=900&q=80", desc: "A balanced latte layered with warm spices and local honey.", prepTimeMinutes: 7, availability: "available" },
  { name: "Single Origin Pour Over", category: "Coffee", price: 5.2, cost: 2.1, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80", desc: "Bright citrus notes, clean finish, brewed on demand.", prepTimeMinutes: 8, availability: "limited" },
  { name: "Moroccan Mint Tea", category: "Tea", price: 3.4, cost: 1.15, img: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=900&q=80", desc: "Fresh mint leaves and green tea with a cooling finish.", prepTimeMinutes: 4, availability: "available" },
  { name: "Chamomile Bloom", category: "Tea", price: 3.1, cost: 1.05, img: "https://images.unsplash.com/photo-1551884831-bbf3cc6472e8?auto=format&fit=crop&w=900&q=80", desc: "A calming herbal infusion served with orange peel.", prepTimeMinutes: 4, availability: "available" },
  { name: "Iced Caramel Macchiato", category: "Cold Drinks", price: 4.9, cost: 1.9, img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80", desc: "Espresso over ice, vanilla sweetness, and velvety milk.", prepTimeMinutes: 5, availability: "available", isPopular: true },
  { name: "Cold Brew Reserve", category: "Cold Drinks", price: 4.6, cost: 1.75, img: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=900&q=80", desc: "Steeped in-house for eighteen hours and served over ice.", prepTimeMinutes: 3, availability: "available" },
  { name: "Berry Hibiscus Cooler", category: "Cold Drinks", price: 4.2, cost: 1.55, img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80", desc: "Sparkling hibiscus, berry compote, and citrus oil.", prepTimeMinutes: 4, availability: "available" },
  { name: "House Breakfast Bowl", category: "Breakfast", price: 9.4, cost: 3.8, img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80", desc: "Greek yogurt, granola, roasted fruit, and seeds.", prepTimeMinutes: 10, availability: "available", isRecommended: true },
  { name: "Avocado Toast", category: "Breakfast", price: 8.2, cost: 3.25, img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80", desc: "Sourdough, smashed avocado, chili flakes, and poached egg.", prepTimeMinutes: 8, availability: "available" },
  { name: "Smoked Turkey Brie", category: "Sandwiches", price: 8.4, cost: 3.95, img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80", desc: "Brie, turkey, fig jam, arugula on artisan bread.", prepTimeMinutes: 9, availability: "available", isPopular: true },
  { name: "Classic Club", category: "Sandwiches", price: 8.1, cost: 3.7, img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80", desc: "Roasted turkey, bacon, lettuce, tomato, and aioli.", prepTimeMinutes: 10, availability: "available" },
  { name: "Halloumi Wrap", category: "Sandwiches", price: 7.8, cost: 3.3, img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80", desc: "Chargrilled halloumi, peppers, herb yogurt, and greens.", prepTimeMinutes: 8, availability: "available" },
  { name: "Margherita Pizza", category: "Pizza", price: 12.6, cost: 4.8, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80", desc: "Fresh mozzarella, basil, tomato sauce, and olive oil.", prepTimeMinutes: 15, availability: "available", isSignature: true },
  { name: "Truffle Mushroom Pizza", category: "Pizza", price: 14.8, cost: 5.5, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80", desc: "Roasted mushrooms, truffle oil, parmesan, and thyme.", prepTimeMinutes: 15, availability: "available" },
  { name: "Smoky BBQ Burger", category: "Burgers", price: 11.8, cost: 4.3, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80", desc: "Beef patty, cheddar, caramelized onions, and house BBQ sauce.", prepTimeMinutes: 12, availability: "available", isPopular: true },
  { name: "Herb Chicken Burger", category: "Burgers", price: 10.9, cost: 4.1, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80", desc: "Grilled chicken breast, lettuce, pickles, and aioli.", prepTimeMinutes: 11, availability: "available" },
  { name: "Wild Mushroom Pasta", category: "Pasta", price: 13.5, cost: 5.1, img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80", desc: "Tagliatelle with roasted mushrooms, garlic, and cream.", prepTimeMinutes: 16, availability: "available" },
  { name: "Pesto Chicken Pasta", category: "Pasta", price: 13.9, cost: 5.2, img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80", desc: "Pesto, grilled chicken, parmesan, and sun-dried tomato.", prepTimeMinutes: 15, availability: "available" },
  { name: "Crispy Calamari", category: "Appetizers", price: 8.8, cost: 3.4, img: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", desc: "Golden fried calamari with lemon aioli and herbs.", prepTimeMinutes: 8, availability: "available" },
  { name: "Truffle Fries", category: "Appetizers", price: 5.5, cost: 2.1, img: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=80", desc: "House-cut fries finished with truffle salt and parmesan.", prepTimeMinutes: 6, availability: "available" },
  { name: "Basque Cheesecake", category: "Desserts", price: 6.8, cost: 2.6, img: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=900&q=80", desc: "Burnt vanilla cheesecake with a caramelized top.", prepTimeMinutes: 7, availability: "available", isPopular: true },
  { name: "Chocolate Torte", category: "Desserts", price: 6.4, cost: 2.4, img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80", desc: "Dark chocolate sponge with ganache and fresh berries.", prepTimeMinutes: 7, availability: "available" },
];

const inventorySeed = [
  { name: "Espresso Beans", category: "Coffee", currentStock: 42, minStockLevel: 10, maxStockLevel: 80, unit: "kg", costPerUnit: 24, supplier: "Northstar Coffee Roasters", storageLocation: "Cold Room A", expirationDate: futureDate(180), notes: "Single-origin Arabica blend" },
  { name: "Whole Milk", category: "Dairy", currentStock: 18, minStockLevel: 8, maxStockLevel: 32, unit: "L", costPerUnit: 1.4, supplier: "Nova Dairy Co.", storageLocation: "Fridge A", expirationDate: futureDate(10), notes: "Pasteurized, 3.5%" },
  { name: "Oat Milk", category: "Dairy", currentStock: 6, minStockLevel: 8, maxStockLevel: 24, unit: "L", costPerUnit: 2.1, supplier: "Plant Pantry", storageLocation: "Fridge A", expirationDate: futureDate(14), notes: "Unsweetened" },
  { name: "Honey", category: "Pantry", currentStock: 11, minStockLevel: 6, maxStockLevel: 20, unit: "kg", costPerUnit: 9.8, supplier: "Golden Valley Apiary", storageLocation: "Dry Store B", expirationDate: futureDate(240), notes: "Local wildflower honey" },
  { name: "Cinnamon", category: "Spices", currentStock: 4, minStockLevel: 5, maxStockLevel: 16, unit: "kg", costPerUnit: 6.2, supplier: "Saffron & Spice", storageLocation: "Dry Store A", expirationDate: futureDate(300), notes: "Ground cinnamon" },
  { name: "Mint Leaves", category: "Produce", currentStock: 3, minStockLevel: 5, maxStockLevel: 18, unit: "kg", costPerUnit: 6.8, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(3), notes: "Fresh herbs" },
  { name: "Chamomile", category: "Herbs", currentStock: 8, minStockLevel: 6, maxStockLevel: 20, unit: "kg", costPerUnit: 4.5, supplier: "Herbal Harvest", storageLocation: "Dry Store A", expirationDate: futureDate(240), notes: "Organic infusion blend" },
  { name: "Vanilla Syrup", category: "Sauces", currentStock: 14, minStockLevel: 6, maxStockLevel: 26, unit: "L", costPerUnit: 3.4, supplier: "Sweetline Supplies", storageLocation: "Dry Store C", expirationDate: futureDate(120), notes: "House vanilla syrup" },
  { name: "Caramel Sauce", category: "Sauces", currentStock: 9, minStockLevel: 6, maxStockLevel: 20, unit: "L", costPerUnit: 3.8, supplier: "Sweetline Supplies", storageLocation: "Dry Store C", expirationDate: futureDate(120), notes: "Premium caramel" },
  { name: "Ice", category: "Beverage", currentStock: 0, minStockLevel: 8, maxStockLevel: 30, unit: "kg", costPerUnit: 0.8, supplier: "Polar Ice", storageLocation: "Freezer", expirationDate: null, notes: "Critical for cold beverages" },
  { name: "Greek Yogurt", category: "Dairy", currentStock: 15, minStockLevel: 8, maxStockLevel: 24, unit: "kg", costPerUnit: 5.8, supplier: "Nova Dairy Co.", storageLocation: "Fridge A", expirationDate: futureDate(8), notes: "Breakfast base" },
  { name: "Sourdough Loaf", category: "Bakery", currentStock: 12, minStockLevel: 6, maxStockLevel: 20, unit: "pcs", costPerUnit: 2.4, supplier: "The Daily Crust", storageLocation: "Bakery Rack", expirationDate: futureDate(2), notes: "Baked fresh daily" },
  { name: "Avocado", category: "Produce", currentStock: 10, minStockLevel: 6, maxStockLevel: 18, unit: "kg", costPerUnit: 4.8, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(5), notes: "Ripe avocados" },
  { name: "Turkey Slices", category: "Meat", currentStock: 7, minStockLevel: 5, maxStockLevel: 16, unit: "kg", costPerUnit: 11.2, supplier: "Riverstone Meats", storageLocation: "Fridge C", expirationDate: futureDate(6), notes: "Smoked turkey" },
  { name: "Brie", category: "Dairy", currentStock: 6, minStockLevel: 4, maxStockLevel: 12, unit: "kg", costPerUnit: 14.8, supplier: "Nova Dairy Co.", storageLocation: "Fridge C", expirationDate: futureDate(5), notes: "Soft-ripened cheese" },
  { name: "Halloumi", category: "Dairy", currentStock: 9, minStockLevel: 4, maxStockLevel: 15, unit: "kg", costPerUnit: 12.1, supplier: "Nova Dairy Co.", storageLocation: "Fridge C", expirationDate: futureDate(7), notes: "Grilled cheese block" },
  { name: "Tomato Sauce", category: "Sauces", currentStock: 14, minStockLevel: 6, maxStockLevel: 24, unit: "L", costPerUnit: 2.2, supplier: "Little Italy Foods", storageLocation: "Dry Store C", expirationDate: futureDate(180), notes: "House pizza sauce" },
  { name: "Fresh Mozzarella", category: "Dairy", currentStock: 8, minStockLevel: 5, maxStockLevel: 16, unit: "kg", costPerUnit: 13.4, supplier: "Nova Dairy Co.", storageLocation: "Fridge C", expirationDate: futureDate(4), notes: "Ball mozzarella" },
  { name: "Beef Patty", category: "Meat", currentStock: 18, minStockLevel: 8, maxStockLevel: 30, unit: "kg", costPerUnit: 16.5, supplier: "Riverstone Meats", storageLocation: "Fridge C", expirationDate: futureDate(4), notes: "Angus patties" },
  { name: "Chicken Breast", category: "Meat", currentStock: 16, minStockLevel: 7, maxStockLevel: 28, unit: "kg", costPerUnit: 9.4, supplier: "Riverstone Meats", storageLocation: "Fridge C", expirationDate: futureDate(5), notes: "Marinated fillets" },
  { name: "Pasta", category: "Dry Goods", currentStock: 24, minStockLevel: 10, maxStockLevel: 45, unit: "kg", costPerUnit: 2.1, supplier: "Little Italy Foods", storageLocation: "Dry Store B", expirationDate: futureDate(240), notes: "Tagliatelle" },
  { name: "Mushrooms", category: "Produce", currentStock: 7, minStockLevel: 5, maxStockLevel: 16, unit: "kg", costPerUnit: 8.1, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(4), notes: "Mixed wild mushrooms" },
  { name: "Calamari", category: "Seafood", currentStock: 5, minStockLevel: 4, maxStockLevel: 12, unit: "kg", costPerUnit: 19.8, supplier: "Harbor Fish Co.", storageLocation: "Freezer", expirationDate: futureDate(6), notes: "Cleaned rings" },
  { name: "Potatoes", category: "Produce", currentStock: 20, minStockLevel: 8, maxStockLevel: 40, unit: "kg", costPerUnit: 1.8, supplier: "Green House Farms", storageLocation: "Dry Store B", expirationDate: futureDate(20), notes: "House-cut fries" },
  { name: "Truffle Oil", category: "Pantry", currentStock: 6, minStockLevel: 4, maxStockLevel: 12, unit: "L", costPerUnit: 28.5, supplier: "Saffron & Spice", storageLocation: "Dry Store A", expirationDate: futureDate(300), notes: "Premium truffle oil" },
  { name: "Parmesan", category: "Dairy", currentStock: 8, minStockLevel: 4, maxStockLevel: 14, unit: "kg", costPerUnit: 17.2, supplier: "Nova Dairy Co.", storageLocation: "Fridge C", expirationDate: futureDate(12), notes: "Hard cheese" },
  { name: "Chocolate", category: "Bakery", currentStock: 14, minStockLevel: 5, maxStockLevel: 20, unit: "kg", costPerUnit: 7.9, supplier: "Sweetline Supplies", storageLocation: "Dry Store C", expirationDate: futureDate(240), notes: "Dark couverture" },
  { name: "Cream", category: "Dairy", currentStock: 11, minStockLevel: 6, maxStockLevel: 24, unit: "L", costPerUnit: 3.6, supplier: "Nova Dairy Co.", storageLocation: "Fridge A", expirationDate: futureDate(6), notes: "For sauces and desserts" },
  { name: "Basil", category: "Produce", currentStock: 4, minStockLevel: 4, maxStockLevel: 14, unit: "kg", costPerUnit: 5.8, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(3), notes: "Fresh herb garnish" },
  { name: "Lettuce", category: "Produce", currentStock: 9, minStockLevel: 5, maxStockLevel: 16, unit: "kg", costPerUnit: 2.2, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(3), notes: "Mixed greens" },
  { name: "Tomatoes", category: "Produce", currentStock: 13, minStockLevel: 6, maxStockLevel: 24, unit: "kg", costPerUnit: 2.8, supplier: "Green House Farms", storageLocation: "Fridge B", expirationDate: futureDate(6), notes: "Slices and salad garnish" },
];

const supplierSeed = [
  { name: "Northstar Coffee Roasters", company: "Northstar Coffee Roasters", contactPerson: "Elena Cruz", email: "orders@northstarcoffee.com", phone: "+1 212 555 0201", address: "19 Mercer St", city: "New York", paymentTerms: "net30", rating: 4.8, totalPurchases: 2800, outstandingBalance: 320, status: "active" },
  { name: "Nova Dairy Co.", company: "Nova Dairy Co.", contactPerson: "Michele Ross", email: "accounts@novadairy.com", phone: "+1 212 555 0202", address: "48 Greenpoint Ave", city: "Brooklyn", paymentTerms: "net15", rating: 4.7, totalPurchases: 2150, outstandingBalance: 180, status: "active" },
  { name: "Green House Farms", company: "Green House Farms", contactPerson: "Aisha Badr", email: "ops@greenhousefarms.com", phone: "+1 212 555 0203", address: "102 Orchard Lane", city: "Queens", paymentTerms: "net30", rating: 4.6, totalPurchases: 1780, outstandingBalance: 95, status: "active" },
  { name: "Riverstone Meats", company: "Riverstone Meats", contactPerson: "Paul Kim", email: "sales@riverstonemeats.com", phone: "+1 212 555 0204", address: "77 River Road", city: "New Jersey", paymentTerms: "net45", rating: 4.5, totalPurchases: 1920, outstandingBalance: 250, status: "active" },
  { name: "Sweetline Supplies", company: "Sweetline Supplies", contactPerson: "Nadia Flores", email: "support@sweetline.com", phone: "+1 212 555 0205", address: "5 West Dock", city: "Long Island", paymentTerms: "net30", rating: 4.4, totalPurchases: 1400, outstandingBalance: 110, status: "active" },
  { name: "Little Italy Foods", company: "Little Italy Foods", contactPerson: "Marco Bellini", email: "purchasing@littleitalyfoods.com", phone: "+1 212 555 0206", address: "144 E 14th Street", city: "Manhattan", paymentTerms: "net30", rating: 4.8, totalPurchases: 1640, outstandingBalance: 140, status: "active" },
];

const tableSeed = Array.from({ length: 24 }, (_, index) => {
  const branch = index < 12 ? branchSeed[0] : branchSeed[1];
  const section = index % 6 === 0 ? "VIP" : index % 5 === 0 ? "Family" : index % 4 === 0 ? "Outdoor" : index % 3 === 0 ? "Private Room" : "Indoor";
  const tableNumber = index + 1;
  let status = "available";
  if (tableNumber === 2 || tableNumber === 8 || tableNumber === 15) status = "occupied";
  if (tableNumber === 4 || tableNumber === 10 || tableNumber === 18) status = "reserved";
  if (tableNumber === 6 || tableNumber === 12 || tableNumber === 20) status = "needs_cleaning";
  return {
    tableNumber,
    qrCode: `BRUNE-${branch.code}-${String(tableNumber).padStart(2, "0")}`,
    status,
    capacity: tableNumber % 3 === 0 ? 6 : tableNumber % 2 === 0 ? 4 : 2,
    minCapacity: 1,
    section,
    branch: branch.name,
    notes: tableNumber % 4 === 0 ? "Best suited for small groups." : "Standard floor table.",
    seatCount: tableNumber % 3 === 0 ? 6 : 4,
    metrics: {
      totalSittingsToday: tableNumber % 5 === 0 ? 3 : 2,
      lastCleanedAt: makeDate(1),
      averageTurnoverMinutes: 55 + (tableNumber % 7) * 5,
      totalRevenueGenerated: 320 + tableNumber * 25,
    },
  };
});

const categorySeed = ["Coffee", "Tea", "Hot Drinks", "Cold Drinks", "Desserts", "Breakfast", "Sandwiches", "Pizza", "Burgers", "Pasta", "Appetizers"];

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateCustomer(index) {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[(index + 3) % lastNames.length];
  const isVIP = index % 17 === 0;
  const membershipLevel = isVIP ? "vip" : index % 8 === 0 ? "gold" : index % 4 === 0 ? "silver" : "bronze";
  const visits = 2 + (index % 5);
  const spending = 45 + index * 12 + (isVIP ? 220 : 0);
  const favoriteProduct = productSeed[(index + 2) % productSeed.length].name;
  const favoriteCategory = productSeed[(index + 2) % productSeed.length].category;
  const firstVisit = makeDate(180 - index % 90);
  const lastVisit = makeDate(index % 40);
  return {
    name: `${first} ${last}`,
    phone: `+1 212 555 ${String(3000 + index).slice(-4)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@mail.com`,
    customerCode: `CUST-${1000 + index}`,
    totalVisits: visits,
    totalSpending: spending,
    averageOrderValue: Math.round((spending / visits) * 100) / 100,
    lastVisitDate: lastVisit,
    firstVisitDate: firstVisit,
    favoriteProducts: [favoriteProduct, productSeed[(index + 4) % productSeed.length].name],
    favoriteProductIds: [],
    visitHistory: Array.from({ length: Math.min(visits, 4) }, (_, visitIndex) => ({
      date: makeDate(60 - visitIndex * 12 - (index % 10)),
      tableNumber: 1 + ((index + visitIndex) % 20),
      total: 18 + ((index + visitIndex) % 8) * 7,
      orderCount: 1 + ((index + visitIndex) % 3),
    })),
    notes: isVIP ? "Prefers a quiet table near the window." : "Loves weekend brunch.",
    isVIP,
    membershipLevel,
    loyaltyPoints: (isVIP ? 1200 : 150) + index * 4,
    totalPointsEarned: (isVIP ? 2200 : 300) + index * 6,
    tags: isVIP ? ["vip", "repeat"] : ["repeat", favoriteCategory.toLowerCase()],
    preferences: {
      favoriteCategories: [favoriteCategory, productSeed[(index + 6) % productSeed.length].category],
      seatingPreference: index % 3 === 0 ? "window" : index % 2 === 0 ? "bar" : "booth",
      allergies: index % 7 === 0 ? "nuts" : "",
    },
  };
}

function pickStatus() {
  return ["Paid", "Preparing", "Ready", "BillRequested", "PaymentInProgress", "Cancelled", "Refunded", "Pending", "Served", "Cleaning"][Math.floor(Math.random() * 10)];
}

async function seedDemoData() {
  try {
    await connectedDB();

    console.log("Clearing previous demo collections...");
    await Promise.all([
      Branch.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
      Table.deleteMany({}),
      Product.deleteMany({}),
      InventoryItem.deleteMany({}),
      Supplier.deleteMany({}),
      Recipe.deleteMany({}),
      CustomerProfile.deleteMany({}),
      Reservation.deleteMany({}),
      Visit.deleteMany({}),
      Order.deleteMany({}),
      PaymentSession.deleteMany({}),
      WaiterRequest.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Settings.deleteMany({}),
      PurchaseOrder.deleteMany({}),
    ]);

    console.log("Creating branches...");
    const branchDocs = await Branch.insertMany(branchSeed);
    const branchMap = new Map(branchDocs.map((branch) => [branch.code, branch]));

    console.log("Creating roles...");
    await Role.insertMany(roleSeed);

    console.log("Creating settings...");
    await Settings.create({
      key: "main",
      data: {
        general: {
          name: "Brúne Coffee & Kitchen",
          description: "An elegant neighborhood restaurant with coffee, brunch, and dinner service.",
          phones: "+1 212 555 0148",
          email: "hello@brune.com",
          address: "142 Harbor Street, Downtown",
          workingHours: [
            { day: "Monday", open: "07:00", close: "22:00" },
            { day: "Tuesday", open: "07:00", close: "22:00" },
            { day: "Wednesday", open: "07:00", close: "22:00" },
            { day: "Thursday", open: "07:00", close: "23:00" },
            { day: "Friday", open: "07:00", close: "23:00" },
            { day: "Saturday", open: "08:00", close: "23:00" },
            { day: "Sunday", open: "08:00", close: "21:00" },
          ],
          currency: "USD",
          taxRate: 0.14,
          serviceCharge: 0.1,
          timezone: "America/New_York",
          language: "en",
        },
        payment: {
          cashEnabled: true,
          cardEnabled: true,
          onlineEnabled: true,
          splitBillEnabled: true,
          tipsEnabled: true,
          defaultPaymentMethod: "Card",
        },
        ordering: {
          orderPrefix: "ORD-",
          onlineOrderingEnabled: true,
          maxItemsPerOrder: 12,
          editWindowSeconds: 300,
          guestCheckout: true,
          minimumOrderAmount: 5,
          autoAcceptOrders: true,
        },
      },
    });

    console.log("Creating employees...");
    const employeeDocs = [];
    for (const employee of employeeSeed) {
      const branch = branchMap.get(employee.branchCode);
      const user = await User.create({
        name: employee.name,
        email: employee.email,
        password: DEMO_PASSWORD,
        phone: employee.phone,
        role: employee.role,
        branchId: branch._id,
        employeeStatus: employee.status,
        branchId: branch._id,
        shift: {
          clockedIn: true,
          clockedInAt: new Date(),
          clockedOutAt: null,
        },
        permissions: employee.role === "Owner" ? ["all"] : [],
        revokedPermissions: employee.name === "Nour Haddad" ? ["inventory.write"] : [],
        skills: employee.role === "Cook" ? ["sauté", "grill", "prep"] : employee.role === "Order Taker" ? ["service", "tables"] : ["operations"],
        assignedSections: employee.branchCode === "HS" ? ["Indoor", "Outdoor"] : ["Indoor", "VIP"],
      });
      employeeDocs.push(user);
    }

    console.log("Creating suppliers...");
    const supplierDocs = await Supplier.insertMany(supplierSeed);

    console.log("Creating inventory...");
    const inventoryDocs = await InventoryItem.insertMany(inventorySeed.map((item) => ({ ...item, supplier: item.supplier })));

    console.log("Creating products...");
    const productDocs = await Product.insertMany(productSeed.map((product, index) => ({
      id: 1000 + index,
      name: product.name,
      category: product.category,
      price: product.price,
      desc: product.desc,
      img: product.img,
      allergens: index % 5 === 0 ? ["milk", "nuts"] : index % 4 === 0 ? ["gluten"] : [],
      ingredients: [product.name],
      nutritionalInfo: {
        calories: 220 + index * 18,
        protein: `${Math.round(product.price * 0.8)}g`,
        carbs: `${Math.round(product.price * 1.2)}g`,
        fat: `${Math.round(product.price * 0.6)}g`,
      },
      prepTimeMinutes: product.prepTimeMinutes,
      availability: product.availability,
      isPopular: product.isPopular || false,
      isRecommended: product.isRecommended || false,
      isSignature: product.isSignature || false,
      stockLevel: 20 + index,
      maxPerOrder: index % 3 === 0 ? 3 : 4,
      taxCategory: "standard",
      sortOrder: index + 1,
      branchId: branchDocs[0]._id,
      isActive: true,
    })));

    console.log("Creating recipes...");
    const inventoryByName = new Map(inventoryDocs.map((item) => [item.name, item]));
    const recipeDocs = [];
    for (const product of productDocs) {
      const ingredientList = [];
      const selectedIngredients = [inventoryByName.get("Espresso Beans"), inventoryByName.get("Whole Milk"), inventoryByName.get("Honey"), inventoryByName.get("Tomato Sauce"), inventoryByName.get("Potatoes"), inventoryByName.get("Mushrooms")].filter(Boolean);
      for (const item of selectedIngredients.slice(0, 2 + (product.name.length % 3))) {
        if (item) {
          ingredientList.push({
            inventoryItem: item._id,
            itemName: item.name,
            quantity: 0.2 + Math.random() * 0.6,
            unit: item.unit,
          });
        }
      }
      if (ingredientList.length === 0) {
        ingredientList.push({
          inventoryItem: inventoryDocs[0]._id,
          itemName: inventoryDocs[0].name,
          quantity: 0.3,
          unit: inventoryDocs[0].unit,
        });
      }
      const recipe = await Recipe.create({
        product: product._id,
        productName: product.name,
        servings: 1,
        ingredients: ingredientList,
        instructions: `Prepare ${product.name} with station-standard timing and garnish.`,
        prepTime: product.prepTimeMinutes,
        costPerServing: product.price * 0.3,
        isActive: true,
      });
      recipeDocs.push(recipe);
    }

    console.log("Creating tables...");
    const tableDocs = await Table.insertMany(tableSeed.map((table) => ({
      ...table,
      branch: table.branch,
      qrCode: table.qrCode,
      assignedWaiter: employeeDocs.find((employee) => employee.role === "Order Taker")?._id || null,
    })));

    console.log("Creating customers...");
    const customerDocs = [];
    for (let index = 0; index < 150; index += 1) {
      const customer = await CustomerProfile.create(generateCustomer(index));
      customerDocs.push(customer);
    }

    const productLookup = new Map(productDocs.map((product) => [product.name, product]));
    const customerLookup = customerDocs.map((customer) => customer);

    console.log("Creating reservations...");
    const reservationDocs = [];
    for (let index = 0; index < 24; index += 1) {
      const table = tableDocs[index % tableDocs.length];
      const status = index % 7 === 0 ? "cancelled" : index % 5 === 0 ? "completed" : index % 3 === 0 ? "no_show" : "confirmed";
      const reservation = await Reservation.create({
        reservationId: `RSV-${1000 + index}`,
        customerName: `${pick(firstNames)} ${pick(lastNames)}`,
        phoneNumber: `+1 212 555 ${String(6000 + index).slice(-4)}`,
        email: `${pick(firstNames).toLowerCase()}.${pick(lastNames).toLowerCase()}${index}@mail.com`,
        partySize: 2 + (index % 6),
        reservationDate: index % 2 === 0 ? futureDate(3 + index % 8) : makeDate(15 + index % 20),
        reservationTime: `${8 + (index % 12)}:30`,
        endTime: `${10 + (index % 8)}:00`,
        table: table._id,
        tableNumber: table.tableNumber,
        preferredSection: table.section,
        notes: index % 3 === 0 ? "Vegetarian preference" : "Window seating requested",
        specialRequests: index % 4 === 0 ? "Birthday cake" : "",
        status,
        branch: table.branch,
        createdBy: employeeDocs[0]?._id || null,
        confirmedAt: status !== "cancelled" ? makeDate(10) : null,
        completedAt: status === "completed" ? makeDate(2) : null,
        cancelledAt: status === "cancelled" ? makeDate(5) : null,
        cancelledReason: status === "cancelled" ? "Guest changed plans" : "",
        noShowAt: status === "no_show" ? makeDate(1) : null,
      });
      reservationDocs.push(reservation);
    }

    console.log("Creating visits and orders...");
    const visitDocs = [];
    const orderDocs = [];
    for (let index = 0; index < 90; index += 1) {
      const customer = customerLookup[index % customerLookup.length];
      const table = tableDocs[index % tableDocs.length];
      const waiter = employeeDocs.filter((employee) => employee.role === "Order Taker")[index % 3];
      const cook = employeeDocs.filter((employee) => employee.role === "Cook")[index % 4];
      const visitStatus = index % 6 === 0 ? "closed" : index % 5 === 0 ? "payment_completed" : "seated";
      const visit = await Visit.create({
        visitNumber: `V-${1000 + index}`,
        source: index % 5 === 0 ? "reservation" : index % 4 === 0 ? "vip" : "walk_in",
        status: visitStatus,
        guestName: customer.name,
        guestPhone: customer.phone,
        guestCount: 2 + (index % 5),
        email: customer.email,
        customerProfileId: customer._id,
        isVIP: customer.isVIP,
        membershipLevel: customer.membershipLevel,
        table: table._id,
        tableNumber: table.tableNumber,
        tableSection: table.section,
        waiter: waiter?._id || null,
        host: employeeDocs.find((employee) => employee.role === "Host")?._id || null,
        cashier: employeeDocs.find((employee) => employee.role === "Cashier")?._id || null,
        subtotal: 25 + index * 1.8,
        discount: index % 7 === 0 ? 4 : 0,
        serviceCharge: 3.5,
        taxAmount: 2.1,
        totalSpent: 32 + index * 2.3,
        paymentStatus: index % 9 === 0 ? "partial" : index % 7 === 0 ? "paid" : "unpaid",
        arrivedAt: makeDate(3 + (index % 40)),
        seatedAt: makeDate(2 + (index % 40)),
        firstOrderAt: makeDate(2 + (index % 35)),
        lastOrderAt: makeDate(1 + (index % 25)),
        billRequestedAt: index % 4 === 0 ? makeDate(1 + (index % 20)) : null,
        paidAt: index % 3 === 0 ? makeDate(1 + (index % 20)) : null,
        closedAt: index % 6 === 0 ? makeDate(index % 10) : null,
        branch: table.branch,
        branchId: branchDocs[0]._id,
      });
      visitDocs.push(visit);

      const lineItems = [];
      const itemCount = 1 + (index % 4);
      let subtotal = 0;
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const product = productDocs[(index + itemIndex) % productDocs.length];
        const qty = 1 + (itemIndex % 2);
        const price = product.price;
        const lineTotal = price * qty;
        subtotal += lineTotal;
        lineItems.push({
          id: `item-${index}-${itemIndex}`,
          name: product.name,
          qty,
          price,
          notes: itemIndex === 0 && index % 4 === 0 ? "No onions please" : "",
          customization: itemIndex === 1 ? [{ optionName: "Temperature", selection: "Extra Hot", priceAdjustment: 0.5 }] : [],
          allergens: itemIndex % 3 === 0 ? ["milk"] : [],
          category: product.category,
          prepTimeMinutes: product.prepTimeMinutes,
          originalPrice: price,
        });
      }
      const taxAmount = subtotal * 0.14;
      const serviceCharge = subtotal * 0.1;
      const discount = index % 6 === 0 ? 3.5 : index % 5 === 0 ? 2 : 0;
      const total = subtotal + taxAmount + serviceCharge - discount;
      const status = pickStatus();
      const order = await Order.create({
        id: `ORD-${1000 + index}`,
        visitId: visit._id,
        visitNumber: visit.visitNumber,
        customer: customer.name,
        code: 200 + index,
        items: lineItems.reduce((accumulator, item) => accumulator + item.qty, 0),
        itemsDetail: lineItems,
        payment: index % 3 === 0 ? "Card" : index % 4 === 0 ? "Online" : "Cash",
        paymentStatus: status === "Refunded" ? "refunded" : status === "Paid" || status === "Served" ? "paid" : status === "Cancelled" ? "unpaid" : status === "PaymentInProgress" ? "partially_paid" : "unpaid",
        total,
        subtotal,
        taxAmount,
        serviceCharge,
        discount,
        status,
        priority: index % 10 === 0 ? "vip" : index % 4 === 0 ? "rush" : "normal",
        tableNumber: table.tableNumber,
        tableId: table._id.toString(),
        tableSession: null,
        submittedBy: waiter?._id || null,
        acceptedBy: cook?._id || null,
        acceptedAt: makeDate(1 + index % 20),
        preparedAt: status === "Preparing" || status === "Ready" || status === "Paid" ? makeDate(index % 10) : null,
        readyAt: status === "Ready" || status === "Paid" ? makeDate(index % 8) : null,
        servedAt: status === "Served" || status === "Paid" ? makeDate(index % 6) : null,
        paidAt: status === "Paid" || status === "Refunded" ? makeDate(index % 4) : null,
        refundedAt: status === "Refunded" ? makeDate(index % 3) : null,
        refundedBy: status === "Refunded" ? waiter?._id || null : null,
        refundAmount: status === "Refunded" ? total * 0.5 : 0,
        refundReason: status === "Refunded" ? "Guest requested a refund after a delay" : "",
        assignedWaiter: waiter?._id || null,
        assignedCook: cook?._id || null,
        branchId: branchDocs[0]._id,
      });
      orderDocs.push(order);
      visit.orders.push(order._id);
      visit.totalOrders = visit.orders.length;
      await visit.save();
    }

    console.log("Creating payment sessions...");
    for (let index = 0; index < 45; index += 1) {
      const order = orderDocs[index % orderDocs.length];
      const amountPaid = order.total * (index % 3 === 0 ? 0.5 : 1);
      await PaymentSession.create({
        visitId: order.visitId,
        visitNumber: order.visitNumber,
        order: order._id,
        orderId: order.id,
        tableNumber: order.tableNumber,
        requestedBy: employeeDocs[10]?._id || null,
        processedBy: employeeDocs[11]?._id || null,
        cashierId: employeeDocs[10]?._id || null,
        status: index % 8 === 0 ? "refunded" : index % 5 === 0 ? "completed" : "pending",
        paymentMethod: index % 3 === 0 ? "Card" : index % 4 === 0 ? "Online" : "Cash",
        subtotal: order.subtotal,
        discount: order.discount,
        taxAmount: order.taxAmount,
        serviceCharge: order.serviceCharge,
        total: order.total,
        amountPaid,
        change: Math.max(0, amountPaid - order.total),
        isSplitPayment: index % 6 === 0,
        splitGroup: index % 6 === 0 ? `split-${index}` : "",
        splitTotal: index % 6 === 0 ? order.total / 2 : null,
        refundedAmount: index % 8 === 0 ? order.total * 0.5 : 0,
        refundReason: index % 8 === 0 ? "Customer requested a refund" : "",
        tipAmount: index % 4 === 0 ? 2.5 : 0,
        startedAt: makeDate(index % 15),
        completedAt: index % 8 !== 0 ? makeDate(index % 10) : null,
      });
    }

    console.log("Creating waiter requests...");
    const tableRequestTargets = tableDocs.slice(0, 12);
    for (let index = 0; index < 18; index += 1) {
      const table = tableRequestTargets[index % tableRequestTargets.length];
      const status = index % 4 === 0 ? "resolved" : index % 3 === 0 ? "pending" : "in_progress";
      await WaiterRequest.create({
        table: table._id,
        tableNumber: table.tableNumber,
        tableSession: null,
        visit: visitDocs[index % visitDocs.length]?._id || null,
        type: index % 5 === 0 ? "need_water" : index % 4 === 0 ? "request_bill" : index % 3 === 0 ? "need_napkins" : "call_waiter",
        status,
        priority: index % 6 === 0 ? "critical" : index % 3 === 0 ? "high" : "medium",
        message: status === "resolved" ? "Resolved quickly by the floor staff." : "Guest requested immediate attention.",
        assignedTo: employeeDocs.filter((employee) => employee.role === "Order Taker")[index % 3]?._id || null,
        acknowledgedAt: status !== "pending" ? makeDate(index % 6) : null,
        resolvedAt: status === "resolved" ? makeDate(index % 3) : null,
        resolvedBy: status === "resolved" ? employeeDocs[0]?._id || null : null,
        responseTimeSeconds: status === "resolved" ? 95 + index : 0,
        resolutionTimeSeconds: status === "resolved" ? 320 + index : 0,
        source: index % 2 === 0 ? "customer" : "staff",
      });
    }

    console.log("Creating notifications...");
    for (let index = 0; index < 40; index += 1) {
      await Notification.create({
        type: index % 6 === 0 ? "inventory_alert" : index % 5 === 0 ? "new_order" : index % 4 === 0 ? "manager_alert" : "shift_reminder",
        title: index % 7 === 0 ? "Critical stock alert" : index % 5 === 0 ? "New order from guest" : "Service reminder",
        message: "The team is keeping the floor running smoothly with automated updates.",
        priority: index % 8 === 0 ? "critical" : index % 4 === 0 ? "high" : "medium",
        recipientId: employeeDocs[index % employeeDocs.length]?._id || null,
        roleTarget: index % 3 === 0 ? "manager" : null,
        senderId: employeeDocs[0]?._id || null,
        read: index % 3 === 0,
        metadata: {
          orderId: index % 2 === 0 ? orderDocs[index % orderDocs.length]?.id || null : null,
          tableNumber: index % 2 === 0 ? tableDocs[index % tableDocs.length]?.tableNumber || null : null,
          url: "/dashboard",
        },
      });
    }

    console.log("Creating audit logs...");
    for (let index = 0; index < 80; index += 1) {
      const user = employeeDocs[index % employeeDocs.length];
      await AuditLog.create({
        user: user?._id || null,
        userName: user?.name || "System",
        userRole: user?.role || "System",
        customer: customerDocs[index % customerDocs.length]?.name || "",
        tableNumber: tableDocs[index % tableDocs.length]?.tableNumber || null,
        orderId: orderDocs[index % orderDocs.length]?.id || null,
        module: index % 5 === 0 ? "inventory" : index % 4 === 0 ? "orders" : index % 3 === 0 ? "payments" : "settings",
        action: index % 6 === 0 ? "Inventory Updated" : index % 5 === 0 ? "Order Created" : index % 4 === 0 ? "Payment Completed" : index % 3 === 0 ? "Product Edited" : "Employee Login",
        description: "Demo activity generated to keep reporting and audit views populated.",
        ip: "192.168.0.18",
        sessionId: `session-${index}`,
        userAgent: "Mozilla/5.0",
        device: "desktop",
      });
    }

    console.log("Creating purchase orders...");
    for (let index = 0; index < 6; index += 1) {
      const supplier = supplierDocs[index % supplierDocs.length];
      const inventoryItem = inventoryDocs[index % inventoryDocs.length];
      await PurchaseOrder.create({
        orderNumber: `PO-${100 + index}`,
        supplier: supplier._id,
        supplierName: supplier.name,
        items: [{
          inventoryItem: inventoryItem._id,
          itemName: inventoryItem.name,
          quantity: 8 + index,
          unit: inventoryItem.unit,
          unitPrice: inventoryItem.costPerUnit,
          totalPrice: inventoryItem.costPerUnit * (8 + index),
          receivedQuantity: index % 2 === 0 ? 8 + index : 0,
        }],
        subtotal: inventoryItem.costPerUnit * (8 + index),
        tax: 0.14 * inventoryItem.costPerUnit * (8 + index),
        shipping: 20,
        total: inventoryItem.costPerUnit * (8 + index) * 1.14 + 20,
        status: index % 3 === 0 ? "received" : index % 2 === 0 ? "approved" : "pending",
        paymentStatus: index % 4 === 0 ? "paid" : "partial",
        orderDate: makeDate(20 + index),
        expectedDeliveryDate: futureDate(3 + index),
        receivedDate: index % 3 === 0 ? futureDate(1 + index) : null,
        createdBy: employeeDocs[13]?._id || null,
        receivedBy: employeeDocs[14]?._id || null,
        notes: "Routine replenishment for high-velocity ingredients.",
        shippingAddress: branchSeed[0].address,
        paymentMethod: index % 2 === 0 ? "Card" : "Cash",
        paidAmount: index % 4 === 0 ? inventoryItem.costPerUnit * (8 + index) * 1.14 + 20 : 0,
      });
    }

    console.log("Demo data seeded successfully.");
    console.log(`Created ${branchDocs.length} branches, ${employeeDocs.length} employees, ${productDocs.length} products, ${inventoryDocs.length} inventory items, ${customerDocs.length} customers, ${tableDocs.length} tables, ${orderDocs.length} orders, ${reservationDocs.length} reservations.`);
  } catch (error) {
    console.error("Demo seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoData();
