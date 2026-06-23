const { createApp } = Vue;

createApp({
  data() {
    return {
      auth: null,
      email: "",
      password: "",
      isLoading: false,
      statusMessage: ""
    };
  },
  mounted() {
    try {
      this.auth = getAmaraAuth();
    } catch (error) {
      this.statusMessage = error.message;
    }
  },
  methods: {
    async login() {
      if (!this.auth) {
        return;
      }

      this.isLoading = true;
      this.statusMessage = "";

      try {
        const credential = await this.auth.signInWithEmailAndPassword(this.email, this.password);

        if (!isAmaraAdmin(credential.user)) {
          await this.auth.signOut();
          this.statusMessage = "This email is not allowed as an admin.";
          return;
        }

        window.location.href = "admin.html";
      } catch (error) {
        console.warn("Admin login failed.", error);
        this.statusMessage = "Login failed. Check email and password, then try again.";
      } finally {
        this.isLoading = false;
      }
    }
  }
}).mount("#admin-login-app");
