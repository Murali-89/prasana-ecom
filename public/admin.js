function getAdminDb() {
  const firebaseSetup = window.AMARA_FIREBASE_CONFIG;

  if (!firebaseSetup || !firebaseSetup.enabled || !window.firebase) {
    throw new Error("Firebase is not enabled. Update public/firebase-config.js first.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseSetup.config);
  }

  return firebase.firestore();
}

function getAdminStorage() {
  getAdminDb();

  if (!firebase.storage) {
    throw new Error("Firebase Storage is not loaded. Check admin.html Firebase scripts.");
  }

  return firebase.storage();
}

function appendCommaSeparatedValue(currentValue, nextValue) {
  return [currentValue, nextValue].filter(Boolean).join(", ");
}

function getUploadImageSettings(folder) {
  return folder === "hero"
    ? { maxDimension: 2200, quality: 0.84 }
    : { maxDimension: 1800, quality: 0.82 };
}

function buildStoragePath(folder, fileName) {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `admin-uploads/${folder}/${Date.now()}-${safeName}`;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read image: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getOptimizedFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, "") + ".jpg";
}

async function optimizeImageFile(file, folder) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const { maxDimension, quality } = getUploadImageSettings(folder);
  const image = await loadImageFile(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "image/jpeg", quality);

  if (!blob || (scale === 1 && blob.size >= file.size)) {
    return file;
  }

  return new File([blob], getOptimizedFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

const adminTabs = ["products", "sizeChart", "policies", "settings"];

function getTabFromHash() {
  const hashTab = window.location.hash.replace("#", "");
  return adminTabs.includes(hashTab) ? hashTab : "products";
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function countCommaSeparated(value) {
  return getCommaSeparatedValues(value).length;
}

function getCommaSeparatedValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function dateInputToSortValue(value, fallbackValue = 0) {
  const dateParts = String(value || "").split("-");

  if (dateParts.length !== 3) {
    return Number(fallbackValue) || 0;
  }

  return Number(dateParts.join("")) || Number(fallbackValue) || 0;
}

function sortValueToDateInput(value) {
  const normalizedValue = String(value || "");

  if (!/^\d{8}$/.test(normalizedValue)) {
    return "";
  }

  return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(4, 6)}-${normalizedValue.slice(6, 8)}`;
}

const emptyProductForm = () => ({
  id: "",
  name: "",
  price: "",
  category: "",
  tagsText: "",
  color: "",
  date: "",
  dateSortValue: 0,
  components: "",
  fit: "",
  washCare: "",
  alt: "",
  imagesText: "",
  description: "",
  active: true
});

const emptySizeForm = () => ({
  id: "",
  size: "",
  bust: "",
  waist: "",
  hip: "",
  shoulder: "",
  armhole: "",
  tag: "",
  sortOrder: 0
});

const { createApp } = Vue;

createApp({
  data() {
    return {
      activeTab: getTabFromHash(),
      auth: null,
      authUnsubscribe: null,
      db: null,
      storage: null,
      products: [],
      sizeRows: [],
      policies: {},
      activeSettingsSection: "contact",
      productForm: emptyProductForm(),
      sizeForm: emptySizeForm(),
      policyForm: {
        id: "privacy",
        title: "Privacy Policy",
        sectionsJson: "[]"
      },
      settingsForm: {
        address: "",
        categories: [],
        email: "",
        facebookUrl: "",
        heroImagesText: "",
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
        whatsappNumber: ""
      },
      newCategory: "",
      isUploading: false,
      isAdminReady: false,
      statusMessage: ""
    };
  },
  computed: {
    tabTitle() {
      return {
        products: "Products",
        sizeChart: "Size Chart",
        policies: "Policies",
        settings: "Site Settings"
      }[this.activeTab];
    },
    previewHref() {
      if (this.activeTab === "sizeChart") {
        return "index.html#size-guide";
      }

      if (this.activeTab === "policies") {
        return {
          about: "about-us.html",
          privacy: "privacy-policy.html",
          refund: "refund-policy.html",
          terms: "terms-conditions.html"
        }[this.policyForm.id] || "index.html";
      }

      if (this.activeTab === "settings") {
        return this.activeSettingSection.previewHref;
      }

      return "index.html#products";
    },
    settingSections() {
      return [
        {
          id: "contact",
          title: "Contact and Social",
          shortTitle: "CS",
          fields: ["phone", "email", "whatsappNumber", "instagramUrl", "facebookUrl", "address"],
          previewHref: "index.html#contact",
          image: "",
          summary: [this.settingsForm.phone, this.settingsForm.email, this.settingsForm.address].filter(Boolean).join(" | ") || "No contact details added yet."
        },
        {
          id: "hero",
          title: "Homepage Hero",
          shortTitle: "HH",
          fields: ["heroImagesText"],
          previewHref: "index.html#hero",
          image: "",
          images: getCommaSeparatedValues(this.settingsForm.heroImagesText),
          summary: `${countCommaSeparated(this.settingsForm.heroImagesText)} hero image(s)`
        },
        {
          id: "categories",
          title: "Product Categories",
          shortTitle: "PC",
          fields: ["categories"],
          previewHref: "index.html#products",
          image: "",
          images: [],
          summary: this.settingsForm.categories.length
            ? this.settingsForm.categories.join(" | ")
            : "No categories added yet."
        },
        {
          id: "philosophy",
          title: "Philosophy Section",
          shortTitle: "PS",
          fields: ["philosophyScript", "philosophyEyebrow", "philosophyTitle", "philosophyLeftImage", "philosophyRightImage", "philosophyBody"],
          previewHref: "index.html#philosophy",
          images: [],
          image: this.settingsForm.philosophyLeftImage || this.settingsForm.philosophyRightImage || "",
          summary: this.settingsForm.philosophyTitle || this.settingsForm.philosophyEyebrow || "No philosophy content added yet."
        },
        {
          id: "sizePromo",
          title: "Size Promo Section",
          shortTitle: "SP",
          fields: ["sizePromoEyebrow", "sizePromoTitle", "sizePromoImage", "sizePromoBody"],
          previewHref: "index.html#size-promo",
          images: [],
          image: this.settingsForm.sizePromoImage || "",
          summary: this.settingsForm.sizePromoTitle || this.settingsForm.sizePromoBody || "No size promo content added yet."
        },
        {
          id: "sizeGuide",
          title: "Size Guide Page",
          shortTitle: "SG",
          fields: [
            "sizeGuideArtImage",
            "sizeGuideIntroBody",
            "sizeGuideIntroEyebrow",
            "sizeGuideIntroTitle",
            "sizeGuideNoteOneBody",
            "sizeGuideNoteOneTitle",
            "sizeGuideNoteTwoBody",
            "sizeGuideNoteTwoTitle"
          ],
          previewHref: "index.html#size-guide",
          images: [],
          image: this.settingsForm.sizeGuideArtImage || "",
          summary: this.settingsForm.sizeGuideIntroTitle || this.settingsForm.sizeGuideIntroBody || "No size guide content added yet."
        },
        {
          id: "footer",
          title: "Footer and Newsletter",
          shortTitle: "FN",
          fields: ["newsletterTitle", "newsletterDescription"],
          previewHref: "index.html#contact",
          images: [],
          image: "",
          summary: this.settingsForm.newsletterTitle || this.settingsForm.newsletterDescription || "No footer content added yet."
        }
      ];
    },
    activeSettingSection() {
      return this.settingSections.find((section) => section.id === this.activeSettingsSection) || this.settingSections[0];
    },
    savedSettingSections() {
      return this.settingSections.filter((section) => (
        section.id === this.activeSettingsSection &&
        section.fields.some((field) => hasValue(this.settingsForm[field]))
      ));
    },
    productCategoryOptions() {
      const categories = Array.isArray(this.settingsForm.categories) ? this.settingsForm.categories : [];

      return getUniqueValues([
        ...categories,
        ...this.products.map((product) => product.category),
        this.productForm.category
      ]);
    }
  },
  mounted() {
    try {
      this.auth = getAmaraAuth();
      this.authUnsubscribe = this.auth.onAuthStateChanged(async (user) => {
        if (!isAmaraAdmin(user)) {
          window.location.href = "admin-login.html";
          return;
        }

        this.isAdminReady = true;
        this.db = getAdminDb();
        this.storage = getAdminStorage();
        await this.loadAll();
        window.addEventListener("hashchange", this.syncTabFromHash);
      });
    } catch (error) {
      this.statusMessage = error.message;
    }
  },
  beforeUnmount() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    window.removeEventListener("hashchange", this.syncTabFromHash);
  },
  methods: {
    setActiveTab(tabName) {
      this.activeTab = tabName;
      if (window.location.hash !== `#${tabName}`) {
        window.history.replaceState(null, "", `#${tabName}`);
      }
    },
    syncTabFromHash() {
      this.activeTab = getTabFromHash();
    },
    formatPrice(price) {
      return `Rs. ${Number(price || 0).toLocaleString("en-IN")}.00`;
    },
    setStatus(message) {
      this.statusMessage = message;
      setTimeout(() => {
        if (this.statusMessage === message) {
          this.statusMessage = "";
        }
      }, 3500);
    },
    async loadAll() {
      await Promise.all([
        this.loadProducts(),
        this.loadSizeRows(),
        this.loadPolicies(),
        this.loadSettings()
      ]);
    },
    async logout() {
      if (!this.auth) {
        return;
      }

      await this.auth.signOut();
      window.location.href = "admin-login.html";
    },
    async uploadFiles(event, targetField, folder = "general", mode = "replace") {
      const files = [...event.target.files];

      if (!files.length) {
        return;
      }

      this.isUploading = true;
      this.setStatus(`Optimizing and uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);

      try {
        const urls = [];

        for (const file of files) {
          const optimizedFile = await optimizeImageFile(file, folder);
          const storageRef = this.storage.ref(buildStoragePath(folder, optimizedFile.name));

          await storageRef.put(optimizedFile, { contentType: optimizedFile.type || file.type });
          urls.push(await storageRef.getDownloadURL());
        }

        const value = urls.join(", ");

        if (targetField === "productImages") {
          this.productForm.imagesText = appendCommaSeparatedValue(this.productForm.imagesText, value);
        } else if (targetField === "heroImagesText") {
          this.settingsForm.heroImagesText = appendCommaSeparatedValue(this.settingsForm.heroImagesText, value);
        } else if (mode === "append") {
          this.settingsForm[targetField] = appendCommaSeparatedValue(this.settingsForm[targetField], value);
        } else {
          this.settingsForm[targetField] = urls[0] || "";
        }

        this.setStatus("Image upload complete. Save the form to store the URL.");
      } catch (error) {
        console.warn("Image upload failed.", error);
        this.setStatus("Image upload failed. Allow this site in Firebase Storage CORS/rules, then try again.");
      } finally {
        this.isUploading = false;
        event.target.value = "";
      }
    },
    async loadProducts() {
      const snapshot = await this.db.collection("products").get();
      this.products = snapshot.docs.map((doc) => {
        const data = doc.data();
        const images = Array.isArray(data.images) ? data.images : [];

        return {
          id: doc.id,
          ...data,
          image: images[0] || data.image || "",
          tags: Array.isArray(data.tags) ? data.tags : []
        };
      });
    },
    async saveProduct() {
      if (!this.productForm.category) {
        this.setStatus("Choose a product category before saving.");
        return;
      }

      const images = this.productForm.imagesText
        .split(",")
        .map((image) => image.trim())
        .filter(Boolean);

      if (!images.length) {
        this.setStatus("Upload product images or paste at least one product image URL.");
        return;
      }

      const tags = this.productForm.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const product = {
        name: this.productForm.name,
        price: Number(this.productForm.price) || 0,
        category: this.productForm.category.trim(),
        tags,
        color: this.productForm.color,
        date: dateInputToSortValue(this.productForm.date, this.productForm.dateSortValue),
        alt: this.productForm.name,
        image: images[0] || "",
        images,
        description: this.productForm.description,
        active: this.productForm.active
      };

      if (this.productForm.id) {
        await this.db.collection("products").doc(this.productForm.id).set(product, { merge: true });
        this.setStatus("Product updated.");
      } else {
        await this.db.collection("products").add(product);
        this.setStatus("Product added.");
      }

      this.resetProductForm();
      await this.loadProducts();
    },
    editProduct(product) {
      this.productForm = {
        id: product.id,
        name: product.name || "",
        price: product.price || "",
        category: product.category || "",
        tagsText: (product.tags || []).join(", "),
        color: product.color || "",
        date: sortValueToDateInput(product.date),
        dateSortValue: Number(product.date) || 0,
        components: product.components || "",
        fit: product.fit || "",
        washCare: product.washCare || "",
        alt: product.alt || "",
        imagesText: (product.images || [product.image]).filter(Boolean).join(", "),
        description: product.description || "",
        active: product.active !== false
      };
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async deleteProduct(productId) {
      if (!confirm("Delete this product?")) {
        return;
      }

      await this.db.collection("products").doc(productId).delete();
      this.setStatus("Product deleted.");
      await this.loadProducts();
    },
    resetProductForm() {
      this.productForm = emptyProductForm();
    },
    async loadSizeRows() {
      const snapshot = await this.db.collection("sizeChart").get();
      this.sizeRows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0));
    },
    async saveSizeRow() {
      const row = {
        size: this.sizeForm.size,
        bust: this.sizeForm.bust,
        waist: this.sizeForm.waist,
        hip: this.sizeForm.hip,
        shoulder: this.sizeForm.shoulder,
        armhole: this.sizeForm.armhole,
        tag: this.sizeForm.tag,
        sortOrder: Number(this.sizeForm.sortOrder) || 0
      };

      if (this.sizeForm.id) {
        await this.db.collection("sizeChart").doc(this.sizeForm.id).set(row, { merge: true });
        this.setStatus("Size row updated.");
      } else {
        await this.db.collection("sizeChart").add(row);
        this.setStatus("Size row added.");
      }

      this.resetSizeForm();
      await this.loadSizeRows();
    },
    editSizeRow(row) {
      this.sizeForm = { ...emptySizeForm(), ...row };
    },
    async deleteSizeRow(rowId) {
      if (!confirm("Delete this size row?")) {
        return;
      }

      await this.db.collection("sizeChart").doc(rowId).delete();
      this.setStatus("Size row deleted.");
      await this.loadSizeRows();
    },
    resetSizeForm() {
      this.sizeForm = emptySizeForm();
    },
    editSettingsSection(sectionId) {
      this.activeSettingsSection = sectionId;
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    addProductCategory() {
      const nextCategory = this.newCategory.trim();
      const categories = Array.isArray(this.settingsForm.categories) ? this.settingsForm.categories : [];

      if (!nextCategory) {
        this.setStatus("Enter a category name.");
        return;
      }

      const existingCategory = categories.find((category) => {
        return category.toLowerCase() === nextCategory.toLowerCase();
      });

      if (existingCategory) {
        this.setStatus("That category already exists.");
        return;
      }

      this.settingsForm.categories = categories;
      this.settingsForm.categories.push(nextCategory);
      this.newCategory = "";
    },
    removeProductCategory(category) {
      if (!confirm(`Remove ${category} from category options? Existing products will keep their saved category.`)) {
        return;
      }

      const categories = Array.isArray(this.settingsForm.categories) ? this.settingsForm.categories : [];
      this.settingsForm.categories = categories.filter((item) => item !== category);

      if (this.productForm.category === category) {
        this.productForm.category = "";
      }
    },
    clearSettingsSection(sectionId) {
      const section = this.settingSections.find((item) => item.id === sectionId);

      if (!section) {
        return;
      }

      section.fields.forEach((field) => {
        this.settingsForm[field] = Array.isArray(this.settingsForm[field]) ? [] : "";
      });
    },
    async deleteSettingsSection(sectionId) {
      const section = this.settingSections.find((item) => item.id === sectionId);

      if (!section || !confirm(`Delete ${section.title} content?`)) {
        return;
      }

      this.clearSettingsSection(sectionId);
      await this.saveSettings(`${section.title} deleted.`);
    },
    async deleteHeroImage(imageIndex) {
      if (!confirm("Delete this hero image?")) {
        return;
      }

      const heroImages = getCommaSeparatedValues(this.settingsForm.heroImagesText);
      heroImages.splice(imageIndex, 1);

      this.settingsForm.heroImagesText = heroImages.join(", ");
      await this.saveSettings("Hero image deleted.");
    },
    async loadPolicies() {
      const snapshot = await this.db.collection("policies").get();
      this.policies = snapshot.docs.reduce((result, doc) => {
        result[doc.id] = doc.data();
        return result;
      }, {});
      this.loadPolicyIntoForm(this.policyForm.id);
    },
    loadPolicyIntoForm(policyId) {
      const policy = this.policies[policyId] || { title: "", sections: [] };
      this.policyForm = {
        id: policyId,
        title: policy.title || "",
        sectionsJson: JSON.stringify(policy.sections || [], null, 2)
      };
    },
    async savePolicy() {
      let sections;

      try {
        sections = JSON.parse(this.policyForm.sectionsJson || "[]");
      } catch (error) {
        this.setStatus("Sections must be valid JSON.");
        return;
      }

      await this.db.collection("policies").doc(this.policyForm.id).set({
        title: this.policyForm.title,
        sections
      });
      this.setStatus("Policy saved.");
      await this.loadPolicies();
    },
    async loadSettings() {
      const doc = await this.db.collection("settings").doc("site").get();

      if (doc.exists) {
        const data = doc.data();
        this.settingsForm = {
          ...this.settingsForm,
          ...data,
          categories: Array.isArray(data.categories) ? getUniqueValues(data.categories) : [],
          heroImagesText: Array.isArray(data.heroImages) ? data.heroImages.join(", ") : ""
        };
      }
    },
    async saveSettingsSection() {
      await this.saveSettings(`${this.activeSettingSection.title} saved.`);
    },
    async saveSettings(message = "Settings saved.") {
      const heroImages = this.settingsForm.heroImagesText
        .split(",")
        .map((image) => image.trim())
        .filter(Boolean);
      const { heroImagesText, ...settings } = this.settingsForm;

      await this.db.collection("settings").doc("site").set({
        ...settings,
        categories: getUniqueValues(settings.categories),
        heroImages
      }, { merge: true });
      this.setStatus(message);
    }
  }
}).mount("#admin-app");
