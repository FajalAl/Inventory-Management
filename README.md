# Smart Inventory & Staff Management
It is full-stack inventory management solution designed specifically for women’s fashion boutiques. It moves beyond simple spreadsheets by offering a secure, role-based environment to track high-value inventory, manage staff permissions, and monitor stock movements in real-time.

# 🚀 Key Features
## 🔐 Advanced Authentication & Security
Dual-Mode Login: Supports both traditional password-based entry and secure OTP (One-Time Password) email verification.
Role-Based Access Control (RBAC): Distinct interfaces and permissions for Admins and Staff.
Row-Level Security (RLS): Database-level protection ensuring that users only access the data they are authorized to see.

## 👗 Boutique-Centric Inventory
Curated Categories: Pre-configured for Women’s Apparel, Handbags, Jewelry, and Footwear.
Smart Stock Tracking: Visual indicators for "OK" vs "⚠️ Restock" status based on custom thresholds.
Transaction Logging: Every stock change (IN/OUT) is tied to a specific staff member for full accountability.

## 👥 Staff Operations
Granular Permissions: Admins can toggle specific capabilities (like can_manage_stock) for individual staff members without changing their overall role.
Account Management: Centralized dashboard to activate, deactivate, or audit staff accounts instantly.

## 🛠️ Tech Stack
Frontend: Next.js (React)
Backend/Database: Supabase (PostgreSQL)
State Management: React Hooks (useState, useEffect)
Styling: Modern, responsive CSS-in-JS for a clean boutique aesthetic.
To view it go to ;https://inventory-management-weld-psi.vercel.app/dashboard
