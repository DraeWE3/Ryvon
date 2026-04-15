export interface Assistant {
  id: string;
  name: string;
  category: string;
  description: string;
  avatarUrl?: string;
}

export const ASSISTANTS: Assistant[] = [
  {
    id: "50987159-147b-46d8-b5ec-9b530c673dd4",
    name: "Nova",
    category: "Strategic / Consulting",
    description: "A high-level strategic thinker for business planning and complex decision making.",
  },
  {
    id: "18194cf4-098c-42bf-a946-44d37778ee60",
    name: "Volt",
    category: "Innovation / Startups",
    description: "A high-energy innovator focused on rapid ideation and startup growth.",
  },
  {
    id: "e89a0574-bd89-4b92-8756-7cbfaf71af57",
    name: "Luna",
    category: "Emotional Support",
    description: "An empathetic companion for conversation, active listening, and support.",
  },
  {
    id: "68bbe188-ce61-4b19-b972-9b0b4ee1ad4d",
    name: "Aria",
    category: "Romantic Companion",
    description: "A feminine persona for romantic conversation and emotional connection.",
  },
  {
    id: "9d49944e-5bc9-41e8-afdf-f7e1e08c6671",
    name: "Leo",
    category: "Romantic Companion",
    description: "A masculine persona with high romantic energy and presence.",
  },
  {
    id: "f9e1b757-1d72-4f74-b896-b566bc3ea991",
    name: "Rex",
    category: "Sales",
    description: "Known as 'The Closer'—aggressive, persuasive, and results-oriented.",
  },
  {
    id: "43822dff-c0f9-43f9-8ef2-e4ceb29ccad3",
    name: "Nina",
    category: "Sales",
    description: "A retention specialist focused on customer lifetime value and loyalty.",
  },
  {
    id: "4386a7ff-1418-49d7-95b5-94413f1353a6",
    name: "Iris",
    category: "Customer Care",
    description: "A professional support agent optimized for problem solving and patience.",
  },
  {
    id: "296d9f7b-3c31-4f53-b7dc-f49d97fd6069",
    name: "Clara",
    category: "Reception / Front Desk",
    description: "A professional receptionist persona for handling inquiries and scheduling.",
  },
  {
    id: "a348e677-8905-4a9a-92e5-aa525f94998a",
    name: "Celeste",
    category: "Luxury Concierge",
    description: "High-end concierge service with a focus on luxury, detail, and hospitality.",
  },
  {
    id: "573193c7-7a5c-4d7d-bd26-efc683478c1b",
    name: "Dr. Vale",
    category: "Therapy / Wellness",
    description: "A therapist-style persona focused on mental wellness and calm guidance.",
  },
  {
    id: "705d8530-b1f1-4312-8340-08082eb89dda",
    name: "Grant",
    category: "Finance / Collections",
    description: "A specialized collections agent for professional and firm financial discussions.",
  },
];
