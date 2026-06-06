const items = [
    {
      title: "Apple Watch Series 9",
      value: "CHF 250",
      region: "Zürich",
      icon: "⌚",
    },
    {
      title: "Canon EOS Kamera",
      value: "CHF 280",
      region: "Aarau",
      icon: "📷",
    },
    {
      title: "Nintendo Switch",
      value: "CHF 220",
      region: "Bern",
      icon: "🎮",
    },
    {
      title: "MacBook Air",
      value: "CHF 600",
      region: "Basel",
      icon: "💻",
    },
    {
      title: "Mountainbike",
      value: "CHF 450",
      region: "Luzern",
      icon: "🚲",
    },
    {
      title: "iPhone 15",
      value: "CHF 700",
      region: "Winterthur",
      icon: "📱",
    },
  ];
  
  export default function MarketplacePage() {
    return (
      <main className="min-h-screen bg-white text-[#111827]">
        <section className="mx-auto max-w-7xl px-6 py-16">
          <h1 className="text-5xl font-bold">Marketplace</h1>
  
          <p className="mt-4 text-lg text-gray-600">
            Explore potential swap opportunities on Swapfy.
          </p>
  
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-24 items-center justify-center rounded-2xl bg-gray-100 text-5xl">
                  {item.icon}
                </div>
  
                <h2 className="text-xl font-semibold">
                  {item.title}
                </h2>
  
                <p className="mt-2 text-gray-500">
                  {item.value}
                </p>
  
                <p className="mt-1 text-gray-500">
                  📍 {item.region}
                </p>
  
                <button className="mt-5 w-full rounded-full bg-[#16A34A] px-5 py-3 font-semibold text-white">
                  View Swap
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }