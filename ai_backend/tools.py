import requests

def get_crypto_prices(ids="bitcoin,ethereum,sui,solana", vs_currencies="usd"):
    """
    Fetches cryptocurrency prices from CoinGecko API.
    """
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": ids,
            "vs_currencies": vs_currencies,
            "include_24hr_change": "true"
        }
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching crypto prices: {e}")
        return {}

def search_web_mock(query):
    """
    Since we don't have a live search tool configured, 
    we will rely on the LLM's vast knowledge base but simulate 
    retrieval for the system prompt context if needed.
    For this implementation, the LLM will generate asset queries.
    """
    pass
