function showAdminMenusForSignedInAdmin() {
  let auth;

  try {
    auth = getAmaraAuth();
  } catch (error) {
    console.warn("Admin menu auth check failed.", error);
    return;
  }

  auth.onAuthStateChanged((user) => {
    const isAdminUser = isAmaraAdmin(user);

    document.querySelectorAll("[data-admin-menu]").forEach((menu) => {
      if (isAdminUser) {
        menu.removeAttribute("hidden");
      } else {
        menu.setAttribute("hidden", "");
      }
    });

    document.querySelectorAll("[data-login-link]").forEach((link) => {
      if (isAdminUser) {
        link.setAttribute("hidden", "");
      } else {
        link.removeAttribute("hidden");
      }
    });
  });
}

showAdminMenusForSignedInAdmin();
