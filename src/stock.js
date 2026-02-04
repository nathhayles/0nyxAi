const API = "http://localhost:3000/api/stock";

export async function searchStock(query) {
  const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Stock search failed");
  return res.json();
}
