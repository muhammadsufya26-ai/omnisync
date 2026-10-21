import {
  PrismaClient,
  ChannelType,
  OrderStatus,
  RiskLevel,
  Role,
} from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function mockHashPassword(rawPassword: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`omnisync_salt_${rawPassword}`)
    .digest("hex");
  return `sha256$${digest}`;
}

async function main() {
  console.log("🌱 Starting OmniSync localized Pakistani D2C database seed...");

  // Clean existing records in reverse dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users: 1 Owner + 2 Customers
  const sufiiAdminUser = await prisma.user.create({
    data: {
      name: "Sufii (Admin)",
      email: "whotf.sufii@gmail.com",
      phone: "+92 300 4119823",
      password: mockHashPassword("Sufii@3003"),
      role: Role.OWNER,
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      name: "Zainab Tariq (Store Owner)",
      email: "owner@omnisync.com",
      phone: "+92 300 4119823",
      password: mockHashPassword("admin123"),
      role: Role.OWNER,
    },
  });

  const customerAyesha = await prisma.user.create({
    data: {
      name: "Ayesha Malik",
      email: "ayesha.malik@example.com",
      phone: "+92 333 5120987",
      password: mockHashPassword("customer123"),
      role: Role.CUSTOMER,
    },
  });

  const customerSana = await prisma.user.create({
    data: {
      name: "Sana Farooq",
      email: "sana.farooq@example.com",
      phone: "+92 301 7745210",
      password: mockHashPassword("customer123"),
      role: Role.CUSTOMER,
    },
  });

  console.log(
    `✅ Seeded 3 users: Owner (${ownerUser.email}), Customer 1 (${customerAyesha.email}), Customer 2 (${customerSana.email}).`
  );

  // 2. Seed 5 sample D2C products with realistic PKR retail prices and stock
  const productsData = [
    {
      sku: "OS-AUD-001",
      name: "AeroPods Pro ANC Wireless Earbuds",
      category: "Audio & Wearables",
      price: 3450,
      stock: 48,
    },
    {
      sku: "OS-WTC-002",
      name: "Chronos Fit AMOLED Smartwatch Gen 3",
      category: "Audio & Wearables",
      price: 6850,
      stock: 32,
    },
    {
      sku: "OS-PWR-003",
      name: "VoltMax 20000mAh 65W PD Power Bank",
      category: "Charging & Power",
      price: 4200,
      stock: 74,
    },
    {
      sku: "OS-KBD-004",
      name: "KeyChronos 75% Hot-Swap Mechanical Keyboard",
      category: "Peripherals",
      price: 11500,
      stock: 19,
    },
    {
      sku: "OS-HUB-005",
      name: "HyperPort 8-in-1 USB-C 4K HDMI Hub",
      category: "Accessories",
      price: 2950,
      stock: 60,
    },
  ];

  const createdProducts = await Promise.all(
    productsData.map((product) =>
      prisma.product.create({
        data: product,
      })
    )
  );

  const bySku = Object.fromEntries(createdProducts.map((p) => [p.sku, p]));

  console.log(`✅ Seeded ${createdProducts.length} products.`);

  // 3. Seed realistic localized Pakistani D2C orders across WhatsApp, Instagram DM, Daraz Store & Online Store
  const ordersData: Array<{
    orderNumber: string;
    channel: ChannelType;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: string;
    status: OrderStatus;
    riskScore: number | null;
    riskLevel: RiskLevel | null;
    riskReason: string | null;
    courierName?: string;
    trackingNumber?: string;
    customerId?: string;
    createdAt: Date;
    items: Array<{ sku: string; quantity: number }>;
  }> = [
    {
      orderNumber: "OMS-1049",
      channel: ChannelType.WHATSAPP,
      customerName: "Bilal Ahmed",
      customerPhone: "+92 300 1234567",
      customerAddress: "Near Gujranwala Bypass, Model Town, Gujranwala",
      city: "Gujranwala",
      status: OrderStatus.PENDING_VERIFICATION,
      riskScore: 82,
      riskLevel: RiskLevel.HIGH_RISK,
      riskReason:
        "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
      courierName: "TCS Express",
      trackingNumber: "TCS-77291048",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      items: [{ sku: "OS-AUD-001", quantity: 1 }],
    },
    {
      orderNumber: "OMS-1048",
      channel: ChannelType.INSTAGRAM,
      customerName: "Ayesha Malik",
      customerPhone: "+92 333 5120987",
      customerAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
      city: "Karachi",
      status: OrderStatus.DISPATCHED,
      riskScore: 12,
      riskLevel: RiskLevel.SAFE,
      riskReason:
        "Sale campaign: Winter drop • Verified Gulshan-e-Iqbal residence with 3 successful COD deliveries.",
      courierName: "Trax Logistics",
      trackingNumber: "TRAX-PK-883921",
      customerId: customerAyesha.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
      items: [{ sku: "OS-WTC-002", quantity: 1 }],
    },
    {
      orderNumber: "OMS-1047",
      channel: ChannelType.DARAZ,
      customerName: "Sana Farooq",
      customerPhone: "+92 301 7745210",
      customerAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
      city: "Islamabad",
      status: OrderStatus.DELIVERED,
      riskScore: 9,
      riskLevel: RiskLevel.SAFE,
      riskReason:
        "Daraz Mall order sync • Complete Sector G-11/2 street address with zero return history.",
      courierName: "Leopards Courier",
      trackingNumber: "LCS-9948210",
      customerId: customerSana.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      items: [
        { sku: "OS-AUD-001", quantity: 1 },
        { sku: "OS-HUB-005", quantity: 1 },
      ],
    },
    {
      orderNumber: "OMS-1046",
      channel: ChannelType.WHATSAPP,
      customerName: "Hamza Siddiqui",
      customerPhone: "0321-9981120",
      customerAddress: "D-Ground Peoples Colony, Faisalabad",
      city: "Faisalabad",
      status: OrderStatus.PENDING_VERIFICATION,
      riskScore: 79,
      riskLevel: RiskLevel.HIGH_RISK,
      riskReason:
        "Ordered via direct DM voice note confirmation • Missing house/plot number in D-Ground Peoples Colony.",
      courierName: "Leopards Courier",
      trackingNumber: "LCS-8821034",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30),
      items: [{ sku: "OS-KBD-004", quantity: 1 }],
    },
    {
      orderNumber: "OMS-1045",
      channel: ChannelType.WEBSITE,
      customerName: "Ayesha Malik",
      customerPhone: "+92 333 5120987",
      customerAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
      city: "Karachi",
      status: OrderStatus.CONFIRMED,
      riskScore: 14,
      riskLevel: RiskLevel.SAFE,
      riskReason:
        "Direct Checkout • Repeat Karachi buyer with verified mobile number and prepaid shipping fee.",
      courierName: "TCS Express",
      trackingNumber: "TCS-77291902",
      customerId: customerAyesha.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 42),
      items: [{ sku: "OS-PWR-003", quantity: 1 }],
    },
    {
      orderNumber: "OMS-1044",
      channel: ChannelType.INSTAGRAM,
      customerName: "Usman Ghani",
      customerPhone: "0312-6654309",
      customerAddress: "Main Boulevard, Johar Town Block G-3, Lahore",
      city: "Lahore",
      status: OrderStatus.PENDING_VERIFICATION,
      riskScore: 64,
      riskLevel: RiskLevel.MODERATE,
      riskReason:
        "Sale campaign: Winter drop • First-time Instagram COD buyer; quick WhatsApp confirmation recommended.",
      courierName: "Trax Logistics",
      trackingNumber: "TRAX-PK-884102",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50),
      items: [{ sku: "OS-AUD-001", quantity: 1 }],
    },
    {
      orderNumber: "OMS-1043",
      channel: ChannelType.WEBSITE,
      customerName: "Sana Farooq",
      customerPhone: "+92 301 7745210",
      customerAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
      city: "Islamabad",
      status: OrderStatus.DISPATCHED,
      riskScore: 11,
      riskLevel: RiskLevel.SAFE,
      riskReason:
        "Direct Checkout • Verified Islamabad residential sector with 98% first-attempt delivery rate.",
      courierName: "TCS Express",
      trackingNumber: "TCS-77294410",
      customerId: customerSana.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 64),
      items: [{ sku: "OS-PWR-003", quantity: 2 }],
    },
    {
      orderNumber: "OMS-1042",
      channel: ChannelType.WHATSAPP,
      customerName: "Ayesha Malik",
      customerPhone: "+92 333 5120987",
      customerAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
      city: "Karachi",
      status: OrderStatus.DELIVERED,
      riskScore: 10,
      riskLevel: RiskLevel.SAFE,
      riskReason:
        "Ordered via direct DM voice note confirmation • Delivered and signed on first courier attempt.",
      courierName: "Leopards Courier",
      trackingNumber: "LCS-9941108",
      customerId: customerAyesha.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
      items: [{ sku: "OS-AUD-001", quantity: 1 }],
    },
  ];

  for (const orderData of ordersData) {
    const resolvedItems = orderData.items.map((item) => {
      const product = bySku[item.sku];
      if (!product) {
        throw new Error(`Missing seeded product for SKU: ${item.sku}`);
      }
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    await prisma.order.create({
      data: {
        orderNumber: orderData.orderNumber,
        channel: orderData.channel,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        city: orderData.city,
        totalAmount,
        status: orderData.status,
        riskScore: orderData.riskScore,
        riskLevel: orderData.riskLevel,
        riskReason: orderData.riskReason,
        courierName: orderData.courierName,
        trackingNumber: orderData.trackingNumber,
        customerId: orderData.customerId,
        createdAt: orderData.createdAt,
        items: {
          create: resolvedItems,
        },
      },
    });
  }

  console.log(`✅ Seeded ${ordersData.length} localized Pakistani D2C orders.`);
  console.log("🎉 OmniSync seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
