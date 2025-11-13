export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    const prompt = `You are an expert CV reviewer. Analyse the following CV text and provide clear, concise feedback in 4 sections:
- Spelling & Grammar
- Layout & Formatting
- Clarity & Conciseness
- Experience & Skills

CV:
${text}
`;

    const resp = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-alpha", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await resp.json();
    const feedback = data[0]?.generated_text || "No feedback received.";

    return new Response(JSON.stringify({ feedback }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
}
