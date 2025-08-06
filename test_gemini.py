import google.generativeai as genai

GEMINI_API_KEY = "AIzaSyDyCUnQumkU9-_mGegPo-bGgp6AeMO2gic"
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel('gemini-1.5-flash')
response = model.generate_content("Hello, this is a test.")
print(response.text)