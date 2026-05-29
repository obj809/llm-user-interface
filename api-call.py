import requests

# URL of the API endpoint
api_url = 'https://api.example.com/data'

# Optional headers (e.g., for authentication)
headers = {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
}

try:
    # Make a GET request to the API
    response = requests.get(api_url, headers=headers)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the response JSON
        data = response.json()
        print("API response data:", data)
    else:
        print(f"Request failed with status code {response.status_code}")
        print("Response content:", response.text)

except requests.exceptions.RequestException as e:
    print("An error occurred:", e)