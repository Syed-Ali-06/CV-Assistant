export default async function handler(req, res) {
  const { text } = await req.json();
  const prompt = `Analyse this CV and give feedback on clarity, grammar, experience, and formatting:\n\n${text}`;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-alpha", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await response.json();
    const output = data[0]?.generated_text || "No feedback received.";
    return new Response(JSON.stringify({ feedback: output }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
