let slides = [];
let activeIndex = 0;
let slideTimer;

function showSlide(index) {
  if (!slides.length) {
    return;
  }

  const previousIndex = activeIndex;
  activeIndex = (index + slides.length) % slides.length;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-previous", slideIndex === previousIndex && slideIndex !== activeIndex);
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });
}

function startHeroCarousel() {
  slides = [...document.querySelectorAll(".hero__slide")];

  if (!slides.length) {
    return;
  }

  if (slideTimer) {
    clearInterval(slideTimer);
  }

  showSlide(0);
  slideTimer = setInterval(() => showSlide(activeIndex + 1), 5000);
}

const products = [];

const sizeRows = [];

function getFirebaseDb() {
  const firebaseSetup = window.AMARA_FIREBASE_CONFIG;

  if (!firebaseSetup || !firebaseSetup.enabled || !window.firebase) {
    return null;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseSetup.config);
  }

  return firebase.firestore();
}

function normalizeFirestoreProduct(documentSnapshot) {
  const data = documentSnapshot.data();
  const images = Array.isArray(data.images) && data.images.length ? data.images : [data.image];

  return {
    id: documentSnapshot.id,
    name: data.name || "Untitled product",
    price: Number(data.price) || 0,
    image: images[0],
    images,
    category: data.category || "Uncategorized",
    tags: Array.isArray(data.tags) ? data.tags : [],
    date: Number(data.date) || 0,
    alt: data.alt || data.name || "srlabel_by_ranga product image",
    color: data.color || "",
    components: data.components || "",
    description: data.description || "",
    fit: data.fit || "",
    washCare: data.washCare || "",
    active: data.active !== false
  };
}

function normalizeSizeRow(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    size: data.size || "",
    bust: data.bust || "",
    waist: data.waist || "",
    hip: data.hip || "",
    shoulder: data.shoulder || "",
    armhole: data.armhole || "",
    tag: data.tag || "",
    sortOrder: Number(data.sortOrder) || 0
  };
}

function normalizeTagName(tag) {
  return String(tag || "").replace(/\s+/g, "").toLowerCase();
}

function getUniqueValues(values) {
  const valueList = Array.isArray(values) ? values : [];
  const seen = new Set();

  return valueList.reduce((result, value) => {
    const nextValue = String(value || "").trim();
    const key = nextValue.toLowerCase();

    if (!nextValue || seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push(nextValue);
    return result;
  }, []);
}

const { createApp } = Vue;

createApp({
  data() {
    return {
      products,
      sizeRows,
      activeMenu: null,
      auth: null,
      authUnsubscribe: null,
      cartItems: [],
      cartMessage: "",
      checkout: {
        email: "",
        marketing: true,
        country: "India",
        firstName: "",
        lastName: "",
        address: "",
        apartment: "",
        city: "",
        state: "Karnataka",
        pin: "",
        phone: ""
      },
      isAdmin: false,
      isCartOpen: false,
      isLoadingProducts: false,
      isMobileMenuOpen: false,
      productLoadMessage: "",
      isWhatsappChatOpen: false,
      orderNote: "",
      orderPlaced: false,
      ownerWhatsappNumber: "918050225964",
      previousViewMode: "featured",
      productSource: "local",
      selectedCategory: "All",
      selectedProduct: null,
      selectedProductImage: "",
      selectedCustomSizeDetails: "",
      selectedSize: "XS",
      selectedTag: "All",
      siteSettings: {
        address: "",
        categories: [],
        email: "",
        facebookUrl: "",
        heroImages: [],
        instagramUrl: "",
        newsletterDescription: "",
        newsletterTitle: "",
        philosophyBody: "",
        philosophyEyebrow: "",
        philosophyLeftImage: "",
        philosophyRightImage: "",
        philosophyScript: "",
        philosophyTitle: "",
        phone: "",
        sizeGuideArtImage: "",
        sizeGuideIntroBody: "",
        sizeGuideIntroEyebrow: "",
        sizeGuideIntroTitle: "",
        sizeGuideNoteOneBody: "",
        sizeGuideNoteOneTitle: "",
        sizeGuideNoteTwoBody: "",
        sizeGuideNoteTwoTitle: "",
        sizePromoBody: "",
        sizePromoEyebrow: "",
        sizePromoImage: "",
        sizePromoTitle: "",
        whatsappNumber: "918050225964"
      },
      email: "",
      subscribeMessage: "",
      whatsappMessage: "Hello, I need some information.",
      showProductSizeChart: false,
      sortOrder: "new",
      viewMode: "featured"
    };
  },
  computed: {
    categories() {
      if (this.siteSettings.categories.length) {
        return this.siteSettings.categories;
      }

      return getUniqueValues(this.products.map((product) => product.category));
    },
    allTags() {
      return [...new Set(this.products.flatMap((product) => product.tags || []))];
    },
    sizeOptions() {
      return this.sizeRows.map((row) => row.size).filter(Boolean);
    },
    hasSizeChartTags() {
      return this.sizeRows.some((row) => row.tag);
    },
    sizeChoices() {
      return getUniqueValues([...this.sizeOptions, "Custom"]);
    },
    isCustomSizeSelected() {
      return this.selectedSize === "Custom";
    },
    collectionTitle() {
      if (this.viewMode === "featured") {
        return "Featured Collection";
      }

      if (this.selectedTag !== "All") {
        return this.selectedTag;
      }

      if (this.selectedCategory !== "All") {
        return this.selectedCategory;
      }

      return "Sets";
    },
    filteredProducts() {
      let filtered = [...this.products];

      if (this.selectedCategory !== "All") {
        filtered = filtered.filter((product) => product.category === this.selectedCategory);
      }

      if (this.selectedTag !== "All") {
        const selectedTag = normalizeTagName(this.selectedTag);
        filtered = filtered.filter((product) => {
          return (product.tags || []).some((tag) => normalizeTagName(tag) === selectedTag);
        });
      }

      return filtered.sort((first, second) => {
        if (this.sortOrder === "price-low") {
          return first.price - second.price;
        }

        if (this.sortOrder === "price-high") {
          return second.price - first.price;
        }

        if (this.sortOrder === "name") {
          return first.name.localeCompare(second.name);
        }

        return second.date - first.date;
      });
    },
    visibleProducts() {
      return this.viewMode === "featured"
        ? this.products.slice(0, 8)
        : this.filteredProducts;
    },
    cartItemCount() {
      return this.cartItems.reduce((total, item) => total + item.quantity, 0);
    },
    cartSubtotal() {
      return this.cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    },
    productGallery() {
      if (!this.selectedProduct) {
        return [];
      }

      if (Array.isArray(this.selectedProduct.images) && this.selectedProduct.images.length) {
        return this.selectedProduct.images;
      }

      const productIndex = this.products.findIndex((product) => product.image === this.selectedProduct.image);
      const gallery = [this.selectedProduct.image];

      for (let offset = 1; gallery.length < 4 && offset < this.products.length; offset += 1) {
        const nextProduct = this.products[(productIndex + offset) % this.products.length];

        if (nextProduct.category === this.selectedProduct.category && !gallery.includes(nextProduct.image)) {
          gallery.push(nextProduct.image);
        }
      }

      for (let offset = 1; gallery.length < 4 && offset < this.products.length; offset += 1) {
        const nextProduct = this.products[(productIndex + offset) % this.products.length];

        if (!gallery.includes(nextProduct.image)) {
          gallery.push(nextProduct.image);
        }
      }

      return gallery;
    },
    productColorOptions() {
      if (!this.selectedProduct) {
        return [];
      }

      const normalize = (value) => String(value || "").trim().toLowerCase();
      const selectedName = normalize(this.selectedProduct.name);
      const selectedCategory = normalize(this.selectedProduct.category);
      const variants = this.products.filter((product) => {
        return normalize(product.name) === selectedName && normalize(product.category) === selectedCategory;
      });
      const hasColor = variants.some((product) => product.color);

      if (variants.length <= 1 && !hasColor) {
        return [];
      }

      const seenColors = new Set();

      return variants.reduce((options, product) => {
        const label = product.color || "Default";
        const colorKey = normalize(label);

        if (seenColors.has(colorKey)) {
          return options;
        }

        seenColors.add(colorKey);
        options.push({ label, product });
        return options;
      }, []);
    },
    productDescription() {
      if (!this.selectedProduct) {
        return "";
      }

      return this.selectedProduct.description || "";
    },
    contactPhoneHref() {
      return `tel:${this.siteSettings.phone}`;
    },
    contactEmailHref() {
      return `mailto:${this.siteSettings.email}`;
    },
    footerWhatsappUrl() {
      return `https://wa.me/${this.ownerWhatsappNumber}`;
    },
    hasPhilosophyContent() {
      return Boolean(
        this.siteSettings.philosophyBody ||
        this.siteSettings.philosophyEyebrow ||
        this.siteSettings.philosophyLeftImage ||
        this.siteSettings.philosophyRightImage ||
        this.siteSettings.philosophyScript ||
        this.siteSettings.philosophyTitle
      );
    },
    hasSizePromoContent() {
      return Boolean(
        this.siteSettings.sizePromoBody ||
        this.siteSettings.sizePromoEyebrow ||
        this.siteSettings.sizePromoImage ||
        this.siteSettings.sizePromoTitle
      );
    },
    orderSummaryText() {
      const items = this.cartItems
        .map((item) => {
          const colorText = item.color ? ` | Color: ${item.color}` : "";
          const customSizeText = item.customSizeDetails ? ` | Custom size: ${item.customSizeDetails}` : "";
          return `${item.product} | Size: ${item.size}${customSizeText}${colorText} | Qty: ${item.quantity} | ${this.formatPrice(item.price * item.quantity)}`;
        })
        .join("\n");

      return [
        "New order received",
        "",
        "Items:",
        items,
        "",
        `Subtotal: ${this.formatPrice(this.cartSubtotal)}`,
        "",
        "Customer:",
        `${this.checkout.firstName} ${this.checkout.lastName}`.trim(),
        `Email: ${this.checkout.email || "Not provided"}`,
        `Phone: ${this.checkout.phone || "Not provided"}`,
        "",
        "Address:",
        this.checkout.address || "Not provided",
        this.checkout.apartment,
        `${this.checkout.city || ""}, ${this.checkout.state || ""} ${this.checkout.pin || ""}`.trim(),
        this.checkout.country,
        "",
        `Order note: ${this.orderNote || "None"}`
      ].filter((line) => line !== undefined && line !== "").join("\n");
    },
    ownerWhatsappUrl() {
      return `https://wa.me/${this.ownerWhatsappNumber}?text=${encodeURIComponent(this.orderSummaryText)}`;
    }
  },
  mounted() {
    startHeroCarousel();
    this.setupAdminVisibility();
    this.loadStoreData().then(() => {
      this.handleInitialHash();
    });
  },
  beforeUnmount() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  },
  methods: {
    formatPrice(price) {
      return `Rs. ${price.toLocaleString("en-IN")}.00`;
    },
    blurActiveLink() {
      if (document.activeElement) {
        document.activeElement.blur();
      }
    },
    openMenu(menuName) {
      this.activeMenu = menuName;
    },
    closeMenu() {
      this.activeMenu = null;
    },
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
      this.closeMenu();
    },
    closeMobileMenu() {
      this.isMobileMenuOpen = false;
    },
    setupAdminVisibility() {
      try {
        this.auth = getAmaraAuth();
        this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
          this.isAdmin = isAmaraAdmin(user);

          if (!this.isAdmin && this.activeMenu === "admin") {
            this.closeMenu();
          }
        });
      } catch (error) {
        console.warn("Admin menu auth check failed.", error);
        this.isAdmin = false;
      }
    },
    scrollToTop() {
      this.$nextTick(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    goHome() {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();
      this.clearProductView();
      this.selectedCategory = "All";
      this.selectedTag = "All";
      this.sortOrder = "new";
      this.viewMode = "featured";

      this.scrollToTop();
    },
    showAllProducts() {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();
      this.clearProductView();
      this.selectedCategory = "All";
      this.selectedTag = "All";
      this.viewMode = "all";

      this.scrollToTop();
    },
    openCategory(category) {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();
      this.clearProductView();
      this.selectedCategory = category;
      this.selectedTag = "All";
      this.viewMode = "all";

      this.scrollToTop();
    },
    openTag(tag) {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();
      this.clearProductView();
      this.selectedCategory = "All";
      this.selectedTag = tag;
      this.viewMode = "all";

      this.scrollToTop();
    },
    openSizeGuide() {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();
      this.clearProductView();
      this.viewMode = "size";

      this.scrollToTop();
    },
    handleInitialHash() {
      const hash = window.location.hash;

      if (hash === "#contact") {
        this.scrollToFooter();
        return;
      }

      if (hash === "#size-guide") {
        this.openSizeGuide();
        return;
      }

      if (hash === "#products") {
        this.showAllProducts();
        return;
      }

      if (["#hero", "#philosophy", "#size-promo"].includes(hash)) {
        this.goHome();
        this.$nextTick(() => {
          const target = document.querySelector(hash);

          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        });
      }
    },
    async loadProductsFromFirestore() {
      const db = getFirebaseDb();

      if (!db) {
        this.productLoadMessage = "Products are not connected yet.";
        console.warn("Firebase is not configured or Firebase scripts are not loaded.");
        return;
      }

      this.isLoadingProducts = true;
      this.productLoadMessage = "";

      try {
        const snapshot = await db.collection("products").get();
        const allFirestoreProducts = snapshot.docs.map(normalizeFirestoreProduct);
        const firestoreProducts = allFirestoreProducts.filter((product) => product.active);

        this.products = firestoreProducts;
        this.productSource = "firestore";

        console.info(
          `Firestore products loaded: ${snapshot.size} document(s), ${firestoreProducts.length} active product(s).`,
          allFirestoreProducts
        );

        if (!snapshot.size) {
          this.productLoadMessage = "No products found.";
        } else if (!firestoreProducts.length) {
          this.productLoadMessage = "No active products found.";
        }
      } catch (error) {
        console.warn("Firestore product loading failed. Using local products instead.", error);
        this.productLoadMessage = "Products could not be loaded.";
      } finally {
        this.isLoadingProducts = false;
      }
    },
    async loadSizeChartFromFirestore() {
      const db = getFirebaseDb();

      if (!db) {
        return;
      }

      try {
        const snapshot = await db.collection("sizeChart").get();
        this.sizeRows = snapshot.docs
          .map(normalizeSizeRow)
          .sort((first, second) => first.sortOrder - second.sortOrder);
      } catch (error) {
        console.warn("Firestore size chart loading failed.", error);
      }
    },
    async loadSiteSettingsFromFirestore() {
      const db = getFirebaseDb();

      if (!db) {
        return;
      }

      try {
        const documentSnapshot = await db.collection("settings").doc("site").get();

        if (!documentSnapshot.exists) {
          return;
        }

        const data = documentSnapshot.data();
        const heroImages = Array.isArray(data.heroImages)
          ? data.heroImages.filter(Boolean)
          : [];

        this.siteSettings = {
          ...this.siteSettings,
          ...data,
          categories: Array.isArray(data.categories) ? getUniqueValues(data.categories) : [],
          heroImages
        };
        this.ownerWhatsappNumber = data.whatsappNumber || this.ownerWhatsappNumber;
        this.$nextTick(startHeroCarousel);
      } catch (error) {
        console.warn("Firestore site settings loading failed.", error);
      }
    },
    async loadStoreData() {
      await Promise.all([
        this.loadProductsFromFirestore(),
        this.loadSizeChartFromFirestore(),
        this.loadSiteSettingsFromFirestore()
      ]);
    },
    clearProductView() {
      this.selectedProduct = null;
      this.selectedProductImage = "";
      this.selectedCustomSizeDetails = "";
      this.selectedSize = "XS";
      this.showProductSizeChart = false;
      this.cartMessage = "";
    },
    createCartItem() {
      const customSizeDetails = this.isCustomSizeSelected ? this.selectedCustomSizeDetails.trim() : "";

      return {
        id: `${this.selectedProduct.id || this.selectedProduct.image}-${this.selectedSize}-${customSizeDetails || "standard"}-${this.selectedProduct.color || "default"}`,
        product: this.selectedProduct.name,
        price: this.selectedProduct.price,
        size: this.selectedSize,
        customSizeDetails,
        color: this.selectedProduct.color || "",
        image: this.selectedProduct.image,
        quantity: 1
      };
    },
    openProduct(product) {
      this.closeMenu();
      this.blurActiveLink();
      this.previousViewMode = this.viewMode;
      this.selectedProduct = product;
      this.selectedProductImage = product.image;
      this.selectedCustomSizeDetails = "";
      this.selectedSize = "XS";
      this.showProductSizeChart = false;
      this.cartMessage = "";
      this.viewMode = "product";

      this.scrollToTop();
    },
    selectProductColor(product) {
      this.selectedProduct = product;
      this.selectedProductImage = product.image;
      this.cartMessage = "";
      this.blurActiveLink();
    },
    returnToCollection() {
      const nextViewMode = this.previousViewMode === "featured" ? "featured" : "all";
      this.clearProductView();
      this.viewMode = nextViewMode;

      this.scrollToTop();
    },
    selectSize(size) {
      this.selectedSize = size;

      if (size !== "Custom") {
        this.selectedCustomSizeDetails = "";
      }
    },
    addToCart() {
      if (this.isCustomSizeSelected && !this.selectedCustomSizeDetails.trim()) {
        this.cartMessage = "Please enter your custom size details before adding to cart.";
        return false;
      }

      const nextItem = this.createCartItem();
      const existingItem = this.cartItems.find((item) => item.id === nextItem.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.cartItems.push(nextItem);
      }

      const colorText = this.selectedProduct.color ? ` / ${this.selectedProduct.color}` : "";
      const customSizeText = nextItem.customSizeDetails ? ` (${nextItem.customSizeDetails})` : "";
      this.cartMessage = `${this.selectedProduct.name} in ${this.selectedSize}${customSizeText}${colorText} has been added to cart.`;
      return true;
    },
    buyNow() {
      if (this.addToCart()) {
        this.openCheckout();
      }
    },
    openCart() {
      this.closeMobileMenu();
      this.isCartOpen = true;
    },
    closeCart() {
      this.isCartOpen = false;
    },
    increaseQuantity(itemId) {
      const item = this.cartItems.find((cartItem) => cartItem.id === itemId);

      if (item) {
        item.quantity += 1;
      }
    },
    decreaseQuantity(itemId) {
      const item = this.cartItems.find((cartItem) => cartItem.id === itemId);

      if (!item) {
        return;
      }

      if (item.quantity === 1) {
        this.cartItems = this.cartItems.filter((cartItem) => cartItem.id !== itemId);
        return;
      }

      item.quantity -= 1;
    },
    openCheckout() {
      if (!this.cartItems.length && this.selectedProduct) {
        if (!this.addToCart()) {
          return;
        }
      }

      this.closeCart();
      this.orderPlaced = false;
      this.viewMode = "checkout";

      this.scrollToTop();
    },
    returnToCartSource() {
      this.viewMode = this.selectedProduct ? "product" : "all";

      this.scrollToTop();
    },
    scrollToFooter() {
      this.closeMobileMenu();
      this.closeMenu();
      this.blurActiveLink();

      this.$nextTick(() => {
        document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
      });
    },
    placeOrder() {
      this.orderPlaced = true;
      window.open(this.ownerWhatsappUrl, "_blank", "noopener");
    },
    openWhatsappChat() {
      this.isWhatsappChatOpen = true;

      this.$nextTick(() => {
        const chatInput = document.querySelector(".whatsapp-chat__form input");

        if (chatInput) {
          chatInput.focus();
        }
      });
    },
    closeWhatsappChat() {
      this.isWhatsappChatOpen = false;
    },
    sendWhatsappMessage() {
      const message = this.whatsappMessage.trim() || "Hello, I need some information.";
      window.open(`https://wa.me/${this.ownerWhatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    },
    subscribe() {
      this.subscribeMessage = "Thanks. We'll keep you posted.";
      this.email = "";
    }
  }
}).mount("#app");
