import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";

const FAQ_DATA = [
  {
    id: "maint-1",
    category: "maintenance",
    question: "How do I pay my monthly maintenance dues online?",
    answer:
      "Go to Maintenance from the sidebar, find your flat's due card, and click 'Pay Online'. You can pay via UPI, Netbanking, Credit/Debit card through Razorpay. Once payment succeeds, an official society receipt is instantly generated and downloadable.",
  },
  {
    id: "maint-2",
    category: "maintenance",
    question: "Can I pay maintenance in cash at the society office?",
    answer:
      "Yes! Choose the 'Pay Cash at Office' option on the payment page. Visit your society office, hand over the exact cash amount, and the admin will record your payment as 'Cash' and issue a physical or digital receipt.",
  },
  {
    id: "maint-3",
    category: "maintenance",
    question: "How do late charges work on overdue maintenance?",
    answer:
      "If a maintenance cycle's due date has passed without payment, any late charge configured by the society committee is automatically added to the invoice until the dues are cleared.",
  },
  {
    id: "col-1",
    category: "maintenance",
    question: "What are Special Collections and Festival Funds?",
    answer:
      "Special Collections are dedicated funds created by the society admin for festivals (e.g. Diwali, Ganesh Utsav), special events, or infrastructure repairs. Residents can contribute directly from the Collections page.",
  },
  {
    id: "comp-1",
    category: "complaints",
    question: "How do I raise a maintenance ticket or complaint?",
    answer:
      "Navigate to Complaints, click 'Raise Complaint', select the category (Electrical, Plumbing, Lift, Cleaning, Noise, etc.), set the priority, choose whether it is Public or Private, and submit. The committee will assign it to staff for resolution.",
  },
  {
    id: "comp-2",
    category: "complaints",
    question: "What is the difference between Public and Private complaints?",
    answer:
      "Public complaints (e.g., street light broken, elevator issue) are visible to all society members so everyone is aware of common issues. Private complaints (e.g., flat seepage, personal grievance) are only visible to you and the society management.",
  },
  {
    id: "amen-1",
    category: "amenities",
    question: "How do I book a society amenity (Clubhouse, Swimming Pool)?",
    answer:
      "Go to Amenities, browse available facilities, and click 'Book Now'. Choose your desired date and available time slot. If the amenity is paid, you can review pricing before confirming.",
  },
  {
    id: "amen-2",
    category: "amenities",
    question: "Why am I blocked from booking an amenity?",
    answer:
      "Societies can restrict amenity bookings for flats with overdue maintenance. Once your maintenance dues are cleared, facility booking access is automatically restored.",
  },
  {
    id: "poll-1",
    category: "polls",
    question: "How do community polls and surveys work?",
    answer:
      "Admins create polls and surveys to gather feedback from residents. Each flat is allotted one vote to ensure fair voting. Secret polls ensure individual choices remain anonymous.",
  },
  {
    id: "chat-1",
    category: "communication",
    question: "How can I contact my society committee or estate manager?",
    answer:
      "You can use the Chat feature to message society admins directly via 1-on-1 Admin DM, or join the general community group chat to discuss updates with fellow residents.",
  },
  {
    id: "sec-1",
    category: "security",
    question: "Where can I find emergency contact numbers for our society?",
    answer:
      "Check the Emergency Contacts page from the sidebar to find phone numbers for the Security Gate, Estate Manager, local Police station, Fire station, and Ambulance services.",
  },
];

const CATEGORIES = [
  { value: "all", label: "All Topics", icon: "help" },
  { value: "maintenance", label: "Maintenance & Dues", icon: "receipt_long" },
  { value: "complaints", label: "Complaints & Helpdesk", icon: "handyman" },
  { value: "amenities", label: "Amenities & Bookings", icon: "pool" },
  { value: "polls", label: "Polls & Surveys", icon: "how_to_vote" },
  { value: "communication", label: "Communication & Chat", icon: "forum" },
  { value: "security", label: "Security & Gate", icon: "shield" },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState("maint-1");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const activeSociety = useSocietyStore(selectActiveSociety);

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText("");
    setTimeout(() => setFeedbackSent(false), 4000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary mb-1"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
        <h1 className="page-title flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[28px]">
            support_agent
          </span>
          Help & Support Center
        </h1>
        <p className="page-subtitle">
          {activeSociety ? `${activeSociety.name} · ` : ""}
          Frequently asked questions, guides, and assistance
        </p>
      </div>

      {/* Hero Search Box */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 text-center shadow-sm space-y-4">
        <h2 className="text-title-lg font-bold text-on-surface">How can we help you today?</h2>
        <p className="text-body-sm text-on-surface-variant max-w-lg mx-auto">
          Search our knowledge base for answers on dues, maintenance tickets, facility bookings, or society guidelines.
        </p>

        <div className="relative max-w-xl mx-auto">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type your question (e.g. pay maintenance, book clubhouse, complaints)..."
            className="w-full rounded-2xl border border-outline-variant bg-surface py-3 pl-12 pr-4 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-4 py-2 text-label-md font-semibold transition-colors cursor-pointer ${
              selectedCategory === cat.value
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline/60 mb-2">
              quiz
            </span>
            <h3 className="text-title-sm font-bold text-on-surface">No answers found</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Try searching with different keywords or select another topic.
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left font-bold text-body-md text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      help_outline
                    </span>
                    {faq.question}
                  </span>
                  <span
                    className={`material-symbols-outlined text-outline transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-primary" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-outline-variant/50 p-4 sm:p-5 bg-surface-container-low/40 text-body-sm text-on-surface-variant leading-relaxed animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Contact & Feedback Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4">
        {/* Emergency Contacts Card */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 mb-3">
              <span className="material-symbols-outlined text-[22px]">emergency</span>
            </div>
            <h3 className="text-title-sm font-bold text-on-surface">Emergency Services</h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Quick access to Security Desk, Ambulance, Police, and Fire emergency contacts.
            </p>
          </div>
          <Link
            to="/emergency-contacts"
            className="mt-4 inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline no-underline"
          >
            <span>View Emergency Directory</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {/* Platform Feedback Form */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <span className="material-symbols-outlined text-[22px]">rate_review</span>
          </div>
          <h3 className="text-title-sm font-bold text-on-surface">Submit Feedback / Report Issue</h3>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Have a suggestion or need help? Send feedback to the ResidentOne team.
          </p>

          {feedbackSent ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-label-md font-medium text-emerald-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                check_circle
              </span>
              <span>Thank you! Your feedback has been submitted.</span>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-2.5">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
                rows={2}
                placeholder="Describe your issue or suggestion..."
                className="w-full rounded-xl border border-outline-variant bg-surface p-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
