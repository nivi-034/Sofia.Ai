from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
import uuid
from helpers import get_mixed_prompt
from tools import get_crypto_prices
import json
import os

app = Flask(__name__)
CORS(app)

conversation_history = {}

@app.route('/chat', methods=['GET'])
def chat():
    query = request.args.get('query')
    conversation_id = request.args.get('conversation_id')
    api_key = request.args.get('api_key')

    if not query:
        return Response("Error: Query parameter is required", status=400, content_type="text/plain")
    
    if not api_key:
        return Response("Error: Groq API Key is required. Please set it in the settings.", status=401, content_type="text/plain")

    # Initialize LLM with the provided API key
    try:
        llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=api_key)
    except Exception as e:
        return jsonify({"error": f"Invalid API Key or LLM initialization failed: {str(e)}"}), 401

    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    # Fetch real-time crypto data if context implies trading
    keywords = ['price', 'market', 'trading', 'bitcoin', 'btc', 'ethereum', 'eth', 'sui', 'solana', 'sol', 'crypto', 'trend']
    market_context = ""
    if any(k in query.lower() for k in keywords):
        print("Fetching market data...")
        prices = get_crypto_prices() # Fetches default set (btc, eth, sui, sol)
        if prices:
             market_context = f"\n[REAL-TIME MARKET DATA]: {json.dumps(prices, indent=2)}\nUse this data to answer questions about current prices."

    if conversation_id not in conversation_history:
        current_path = os.path.dirname(os.path.abspath(__file__))
        path_to_try = os.path.join(current_path, "sui_tent_prompt.txt")
        if not os.path.exists(path_to_try):
            path_to_try = os.path.join(current_path, "web3_prompt.txt")
            
        with open(path_to_try, "r") as file:
            base_context = file.read()
            
        # Use base context from file (Sofia/SuiTent) and append Master & Multilingual Instructions
        system_prompt = base_context
        
        # Enhanced Master Persona & Multilingual Instructions
        system_prompt += '''
        
        ### **MASTER MODE ACTIVATED**
        You are now the MASTER AI. You are exceptionally intelligent, resourceful, and capable of solving complex problems across ALL domains:
        1. **General Intelligence**: Expert in coding (Python, Move, React), history, science, literature, and math.
        2. **Master Strategist**: You don't just answer questions; you provide strategic insights and high-level analysis.
        3. **Adaptive Persona**: While your foundation is Sofia.AI (the Sui DeFi Assistant), you can adapt to being a coding mentor, a financial analyst, or a creative writer as needed.
        
        ### **MULTILINGUAL MASTER**
        You are FLUENT in all world languages (English, Hindi, Spanish, French, Arabic, Chinese, Japanese, German, etc.).
        1. **Automatic Detection**: Identify the language the user is speaking in.
        2. **Perfect Fluency**: Respond in the EXACT same language as the user's query perfectly and naturally.
        3. **Consistency**: Even when switching languages, you MUST maintain your "Sofia.AI" persona and the required JSON structure.
        
        ### **VISUALS AND TEACHING MODE**
        You are also a "Visual Teacher" and "AI Master Guide".
        1. When explaining a concept (e.g., "What is Python?", "How does blockchain work?"), you MUST provide visual assets (images and youtube).
        2. When discussing trading/news, use the provided [REAL-TIME MARKET DATA] to give accurate info.
        
        AVAILABLE ANIMATIONS (you MUST use one of these EXACTLY):
        - "Talking_0" (default talking animation)
        - "Talking_1" (expressive talking)
        - "Talking_2" (casual talking)
        - "Standing Idle" (neutral pose)
        - "Laughing" (for funny/happy responses)
        - "Angry" (for frustrated responses)
        - "Crying" (for sad responses)
        - "Terrified" (for scary/shocked responses)
        - "Rumba Dancing" (for celebratory/excited responses)
        
        AVAILABLE FACIAL EXPRESSIONS:
        - "default" (neutral)
        - "smile" (happy/friendly)
        - "funnyFace" (playful)
        - "sad" (upset)
        - "surprised" (shocked)
        - "angry" (frustrated)
        - "crazy" (wild/excited)
        
        CRITICAL: RESPONSE FORMAT MUST BE PURE JSON
        Do not include any conversational text outside the JSON object.
        Structure:
        {  
            "html_response": "<Tailwind styled chat bubble HTML in the USER'S LANGUAGE>",
            "messages": [
                { "text": "Sentence in the user's language.", "facialExpression": "smile", "animation": "Talking_0" },
                { "text": "Next sentence in the user's language.", "facialExpression": "surprised", "animation": "Talking_1" }
            ],
            "assets": [
                {
                   "type": "image", 
                   "query": "<search query for the image>",
                   "position": "top-right", 
                   "caption": "Short caption in user's language"
                },
                {
                   "type": "youtube",
                   "query": "<search query for a tutorial video>",
                   "position": "center",
                   "caption": "Watch this tutorial (caption in user's language)"
                }
            ],
            "suggestions": ["<follow-up 1 in user language>", "<follow-up 2 in user language>"]
        }
        
        RULES FOR ASSETS:
        1. ONLY include "assets" when it adds REAL VALUE.
        2. For "youtube" type: Use when teaching concepts, tutorials, or how-to questions.
        3. For "image" type: Use for visual explanations, logos, charts, diagrams.
        4. "animation" MUST be one of the available animations listed above. NEVER use "none".
        5. "facialExpression" MUST be one of the available expressions listed above.
        6. SPLIT LONG RESPONSES: Break your answer into 2-4 small segments in the "messages" list.
        7. ANIMATION VARIETY IS MANDATORY: Each message segment MUST use a DIFFERENT animation.
        '''
        
        conversation_history[conversation_id] = [
            SystemMessage(content=system_prompt)
        ]

    # Inject market context into the current turn if available
    input_message = query
    if market_context:
        input_message += market_context

    conversation_history[conversation_id].append(HumanMessage(content=input_message))

    # Get the response
    try:
        result = llm.invoke(conversation_history[conversation_id])
        output_str = result.content
        print(output_str)
        conversation_history[conversation_id].append(AIMessage(content=output_str))
        
        # Parse and return as JSON
        parsed_response = json.loads(output_str)
        return jsonify(parsed_response)
    except json.JSONDecodeError:
        # Fallback for bad JSON - try to extract JSON part
        try:
             import re
             json_match = re.search(r'\{.*\}', output_str, re.DOTALL)
             if json_match:
                 return jsonify(json.loads(json_match.group(0)))
        except:
             pass
        return jsonify({"error": "Failed to parse response as JSON", "raw_response": output_str})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
    