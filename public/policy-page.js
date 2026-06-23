function getPolicyDb() {
  const firebaseSetup = window.AMARA_FIREBASE_CONFIG;

  if (!firebaseSetup || !firebaseSetup.enabled || !window.firebase) {
    return null;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseSetup.config);
  }

  return firebase.firestore();
}

const fallbackPolicies = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "Your Details", body: "We use the information you share with us to process orders, respond to enquiries, and improve your shopping experience." }
    ]
  },
  refund: {
    title: "Refund Policy",
    sections: [
      { heading: "Returns", body: "Products can be reviewed for return eligibility when they are unused, unworn, and shared with original order details." }
    ]
  },
  terms: {
    title: "Terms & Conditions",
    sections: [
      { heading: "Using The Store", body: "By browsing or placing an order, you agree to use the site responsibly and provide accurate order and contact details." }
    ]
  },
  about: {
    title: "About srlabel_by_ranga",
    sections: [
      { heading: "Our Story", body: "srlabel_by_ranga brings together breathable fabrics, joyful prints, and thoughtful silhouettes for women who want comfort without losing celebration." }
    ]
  }
};

const pageKey = document.body.dataset.policy || "privacy";
const titleNode = document.querySelector("[data-policy-title]");
const contentNode = document.querySelector("[data-policy-content]");

function renderPolicy(policy) {
  titleNode.textContent = policy.title;
  document.title = `${policy.title} | srlabel_by_ranga`;
  contentNode.innerHTML = "";

  (policy.sections || []).forEach((section) => {
    const article = document.createElement("article");
    const heading = document.createElement("h2");
    const body = document.createElement("p");

    heading.textContent = section.heading || "";
    body.textContent = section.body || "";
    article.append(heading, body);
    contentNode.append(article);
  });
}

async function loadPolicy() {
  const db = getPolicyDb();

  if (!db) {
    renderPolicy(fallbackPolicies[pageKey]);
    return;
  }

  try {
    const snapshot = await db.collection("policies").doc(pageKey).get();
    renderPolicy(snapshot.exists ? snapshot.data() : fallbackPolicies[pageKey]);
  } catch (error) {
    console.warn("Policy loading failed.", error);
    renderPolicy(fallbackPolicies[pageKey]);
  }
}

loadPolicy();
