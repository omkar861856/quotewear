import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/core-flows";
import {
  ExecArgs,
  IFulfillmentModuleService,
  ISalesChannelModuleService,
  IStoreModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );
  const salesChannelModuleService: ISalesChannelModuleService =
    container.resolve(ModuleRegistrationName.SALES_CHANNEL);
  const storeModuleService: IStoreModuleService = container.resolve(
    ModuleRegistrationName.STORE
  );

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "eur",
            is_default: true,
          },
          {
            currency_code: "usd",
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Europe",
          currency_code: "eur",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default",
            type: "default",
          },
        ],
      },
    });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Europe",
        geo_zones: [
          {
            country_code: "gb",
            type: "country",
          },
          {
            country_code: "de",
            type: "country",
          },
          {
            country_code: "dk",
            type: "country",
          },
          {
            country_code: "se",
            type: "country",
          },
          {
            country_code: "fr",
            type: "country",
          },
          {
            country_code: "es",
            type: "country",
          },
          {
            country_code: "it",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: '"true"',
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: '"true"',
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "Webshop",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const publishableApiKey = publishableApiKeyResult[0];

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const {
    result: [collection],
  } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "Featured",
          handle: "featured",
        },
      ],
    },
  });

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Custom Shirts & Caps",
          is_active: true,
        },
        {
          name: "Corporate Polos",
          is_active: true,
        },
        {
          name: "Hoodies & Sweatshirts",
          is_active: true,
        },
        {
          name: "Outerwear & Jackets",
          is_active: true,
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Classic Crewneck Event T-Shirt",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Custom Shirts & Caps")?.id!,
          ],
          description:
            "Perfect for company events, conferences, and promotions. Made from 100% premium soft cotton, this t-shirt offers a comfortable regular fit and is optimized for vibrant, long-lasting custom screen printing.",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Navy", "White", "Black"],
            },
          ],
          variants: [
            {
              title: "Navy / S",
              sku: "TSHIRT-NAVY-S",
              options: { Size: "S", Color: "Navy" },
              manage_inventory: false,
              prices: [
                { amount: 12, currency_code: "eur" },
                { amount: 12, currency_code: "usd" },
              ],
            },
            {
              title: "Navy / M",
              sku: "TSHIRT-NAVY-M",
              options: { Size: "M", Color: "Navy" },
              manage_inventory: false,
              prices: [
                { amount: 12, currency_code: "eur" },
                { amount: 12, currency_code: "usd" },
              ],
            },
            {
              title: "Navy / L",
              sku: "TSHIRT-NAVY-L",
              options: { Size: "L", Color: "Navy" },
              manage_inventory: false,
              prices: [
                { amount: 12, currency_code: "eur" },
                { amount: 12, currency_code: "usd" },
              ],
            },
            {
              title: "White / S",
              sku: "TSHIRT-WHITE-S",
              options: { Size: "S", Color: "White" },
              manage_inventory: false,
              prices: [
                { amount: 10, currency_code: "eur" },
                { amount: 10, currency_code: "usd" },
              ],
            },
            {
              title: "White / M",
              sku: "TSHIRT-WHITE-M",
              options: { Size: "M", Color: "White" },
              manage_inventory: false,
              prices: [
                { amount: 10, currency_code: "eur" },
                { amount: 10, currency_code: "usd" },
              ],
            },
            {
              title: "Black / L",
              sku: "TSHIRT-BLACK-L",
              options: { Size: "L", Color: "Black" },
              manage_inventory: false,
              prices: [
                { amount: 12, currency_code: "eur" },
                { amount: 12, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Premium Piqué Polo Shirt",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Corporate Polos")?.id!,
          ],
          description:
            "Designed for corporate teams, client-facing events, and professional casual wear. Features a structured knit collar, clean three-button placket, and breathable piqué mesh texture. Perfect for custom logo embroidery.",
          weight: 250,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Royal Blue", "Black", "White"],
            },
          ],
          variants: [
            {
              title: "Royal Blue / M",
              sku: "POLO-ROYAL-M",
              options: { Size: "M", Color: "Royal Blue" },
              manage_inventory: false,
              prices: [
                { amount: 22, currency_code: "eur" },
                { amount: 22, currency_code: "usd" },
              ],
            },
            {
              title: "Royal Blue / L",
              sku: "POLO-ROYAL-L",
              options: { Size: "L", Color: "Royal Blue" },
              manage_inventory: false,
              prices: [
                { amount: 22, currency_code: "eur" },
                { amount: 22, currency_code: "usd" },
              ],
            },
            {
              title: "Black / M",
              sku: "POLO-BLACK-M",
              options: { Size: "M", Color: "Black" },
              manage_inventory: false,
              prices: [
                { amount: 22, currency_code: "eur" },
                { amount: 22, currency_code: "usd" },
              ],
            },
            {
              title: "White / L",
              sku: "POLO-WHITE-L",
              options: { Size: "L", Color: "White" },
              manage_inventory: false,
              prices: [
                { amount: 20, currency_code: "eur" },
                { amount: 20, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Heavyweight Pullover Hoodie",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Hoodies & Sweatshirts")?.id!,
          ],
          description:
            "A premium corporate gift or high-quality team swag. Double-lined hood, matching drawcords, and a front pouch pocket. Made from a durable cotton-poly blend, ideal for printing or high-density embroidery.",
          weight: 500,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/hoodie-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Charcoal", "Black", "Navy"],
            },
          ],
          variants: [
            {
              title: "Charcoal / M",
              sku: "HOODIE-CHARCOAL-M",
              options: { Size: "M", Color: "Charcoal" },
              manage_inventory: false,
              prices: [
                { amount: 38, currency_code: "eur" },
                { amount: 38, currency_code: "usd" },
              ],
            },
            {
              title: "Charcoal / L",
              sku: "HOODIE-CHARCOAL-L",
              options: { Size: "L", Color: "Charcoal" },
              manage_inventory: false,
              prices: [
                { amount: 38, currency_code: "eur" },
                { amount: 38, currency_code: "usd" },
              ],
            },
            {
              title: "Black / L",
              sku: "HOODIE-BLACK-L",
              options: { Size: "L", Color: "Black" },
              manage_inventory: false,
              prices: [
                { amount: 38, currency_code: "eur" },
                { amount: 38, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Professional Softshell Jacket",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Outerwear & Jackets")?.id!,
          ],
          description:
            "Wind and water-resistant softshell jacket tailored for corporate staff and outdoor business events. Features a microfleece lining, zippered pockets, and high quality stitching, ideal for subtle chest embroidery.",
          weight: 600,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Black", "Navy"],
            },
          ],
          variants: [
            {
              title: "Black / M",
              sku: "JACKET-BLACK-M",
              options: { Size: "M", Color: "Black" },
              manage_inventory: false,
              prices: [
                { amount: 65, currency_code: "eur" },
                { amount: 65, currency_code: "usd" },
              ],
            },
            {
              title: "Navy / L",
              sku: "JACKET-NAVY-L",
              options: { Size: "L", Color: "Navy" },
              manage_inventory: false,
              prices: [
                { amount: 65, currency_code: "eur" },
                { amount: 65, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });

  logger.info("Finished seeding product data.");
}
