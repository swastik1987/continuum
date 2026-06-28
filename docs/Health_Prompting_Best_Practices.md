# Best Practices for Health Prompts with AI

**Disclaimer:** AI models provide health information and education, not medical advice, diagnosis, or treatment. Always consult a licensed healthcare professional for medical issues.

To get the most accurate, useful, and safe health information, structure your prompts using these guidelines:

## 1. Assign a Specific Specialist Persona
Don't just ask the AI to "act as a doctor." Assign a specific, highly credentialed role based on your query to focus the AI's reasoning.
* **Weak:** "Act as a doctor and tell me about joint pain."
* **Strong:** "Act as a board-certified rheumatologist who specializes in autoimmune disorders..."
* **Other Personas:** Registered Dietitian, Sports Medicine Physician, Pediatric Neurologist, Clinical Pharmacist, Medical Researcher.

## 2. Provide the "Patient" Context
Medical information is highly dependent on context. Always provide a baseline profile:
* **Demographics:** Age, biological sex, general fitness level.
* **Vitals & Lifestyle:** Sleep habits, diet style, exercise frequency, alcohol/tobacco use.
* **History:** Pre-existing conditions, past surgeries, family history of major diseases.
* **Current Regimen:** Medications (and dosages), supplements, vitamins.

## 3. Detail Symptoms using the PQRST Method
Use the clinical PQRST framework to describe what you are experiencing rather than giving vague descriptions:
* **P - Provokes:** What causes it? What makes it better or worse? (e.g., "Worse after eating spicy food.")
* **Q - Quality:** What does it actually feel like? (e.g., "Burning, tight sensation.")
* **R - Radiates:** Does the feeling move anywhere else? (e.g., "Stays in the center of the chest.")
* **S - Severity:** How intense is it (1-10)? Does it impact daily life? (e.g., "4/10, annoying but manageable.")
* **T - Timing:** When did it start? Is it constant or intermittent? (e.g., "Started 3 days ago, mostly at night.")

## 4. Define the Desired Output (The "Safe Actions")
Ask the AI to educate, prepare, and translate, rather than diagnose.
* **The Translator:** "Translate this MRI report into plain English..."
* **The Prep Assistant:** "Generate a list of 5 specific questions I should ask my gastroenterologist..."
* **The Researcher:** "Summarize the latest peer-reviewed clinical guidelines regarding..."
* **The Mechanism Explainer:** "Walk me through the biological mechanism of how X works..."

## 5. Example of a "Perfect" Health Prompt
> "Act as a clinical pharmacist and sports nutritionist. I am a 35-year-old female runner training for a marathon. I have a history of mild anemia and am currently taking 65mg of iron bisglycinate daily, along with a standard daily multivitamin.
> 
> I am considering adding Ashwagandha and a Magnesium supplement to my routine to help with sleep and recovery.
> 
> **Task:** Please analyze potential interactions between these four supplements. Break down the biochemical purpose of each, and tell me if there are optimal times of day to take them to maximize absorption and minimize gastrointestinal distress. Provide the information in a table."
