const MarketStore = {

    data: null,

    async load() {

        if (this.data) {

            console.log("📦 Using cached MarketStore");

            return this.data;

        }

        console.log("🌐 Fetching Dashboard API...");

        const response = await fetch("/api/dashboard/");

        this.data = await response.json();

        console.log("✅ MarketStore Loaded", this.data);

        return this.data;

    }

};