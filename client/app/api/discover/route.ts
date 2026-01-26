
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const apiKey = process.env.NEWSDATA_API_KEY;

    if (apiKey) {
        try {
            // Fetch latest news from newsdata.io
            // language=en, country=us (or others), category=technology,science,business
            const res = await fetch(`https://newsdata.io/api/1/latest?apikey=${apiKey}&language=en&category=technology,science,business`, {
                next: { revalidate: 3600 } // Cache for 1 hour
            });

            if (res.ok) {
                const json = await res.json();
                if (json.results && json.results.length > 0) {
                    // Transform data to our format
                    const items = json.results.map((article: any) => ({
                        title: article.title,
                        description: article.description,
                        imageUrl: article.image_url || null, // Some might be null
                        sourceCount: Math.floor(Math.random() * 50) + 10, // Mock source count as API doesn't provide it
                        timeAgo: calculateTimeAgo(article.pubDate),
                        category: article.category ? article.category[0] : 'General',
                        link: article.link // Original link
                    }));

                    // Pick the first item with an image as hero, or just the first item
                    let heroIndex = items.findIndex((item: any) => item.imageUrl);
                    if (heroIndex === -1) heroIndex = 0;

                    const hero = items[heroIndex];
                    // Remove hero from list
                    const listItems = items.filter((_: any, index: number) => index !== heroIndex);

                    return NextResponse.json({
                        hero: {
                            ...hero,
                            // Ensure hero has an image if possible, or fallback
                            imageUrl: hero.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2000"
                        },
                        items: listItems
                    });
                }
            } else {
                console.error("Newsdata API failed:", res.status, await res.text());
            }
        } catch (error) {
            console.error("Failed to fetch from Newsdata:", error);
        }
    }

    // Fallback to mock data if API fails or no key
    console.log("Using fallback mock data for Discover");

    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay

    const data = {
        hero: {
            title: "Reliance launches Jio Electric Cycle with 180 km range",
            description: "The cycle targets urban commuters with EMIs starting at Rs 999, marking Reliance's entry into India's growing electric mobility market.",
            imageUrl: "https://images.unsplash.com/photo-1571181520846-953e53df4e71?q=80&w=2000&auto=format&fit=crop",
            sourceCount: 66,
            timeAgo: "10 hours ago",
            category: "Technology"
        },
        items: [
            {
                title: "India's 2026 budget faces calls for tariff relief, tax cuts",
                imageUrl: "https://images.unsplash.com/photo-1526304640155-246e08b493fe?q=80&w=1000&auto=format&fit=crop",
                sourceCount: 52,
            },
            {
                title: "Iran crackdown death toll may exceed 36,000, leaked documents show",
                imageUrl: "https://images.unsplash.com/photo-1543165365-07232fe12224?q=80&w=1000&auto=format&fit=crop",
                sourceCount: 40,
            },
            {
                title: "SpaceX Starship successfully reaches orbit in fourth flight test",
                imageUrl: "https://images.unsplash.com/photo-1517976487492-5750f3195933?q=80&w=1000&auto=format&fit=crop",
                sourceCount: 128,
            },
            {
                title: "Apple announces major AI features in iOS 18 update",
                imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop",
                sourceCount: 89,
            }
        ]
    };

    return NextResponse.json(data);
}

function calculateTimeAgo(dateString: string) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}
