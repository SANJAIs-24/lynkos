const API_URL = "https://lynkos-be-prod.loca.lt"; 

export async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: "GET",
            headers: {
                "Bypass-Tunnel-Reminder": "true", // The important bypass header
                "Content-Type": "application/json"
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Connection failed:", error);
    }
}