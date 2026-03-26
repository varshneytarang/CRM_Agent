import { useState } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  MessageCircle,
  Mail,
  ExternalLink,
  Book,
  Video,
  Lightbulb,
} from "lucide-react";

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful_count?: number;
}

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  related_articles?: string[];
}

interface HelpCenterProps {
  faqs?: FAQItem[];
  guides?: GuideSection[];
  loading?: boolean;
  onContactSupport?: () => void;
}

interface ExpandedFAQ {
  [faqId: string]: boolean;
}

export default function HelpCenter({
  faqs,
  guides,
  loading,
  onContactSupport,
}: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<ExpandedFAQ>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ((prev) => ({
      ...prev,
      [faqId]: !prev[faqId],
    }));
  };

  const filteredFAQs = faqs
    ?.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));

  const categories = Array.from(new Set(faqs?.map((faq) => faq.category) || []));

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Loading help center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-blue-100">
          Find answers, guides, and support resources
        </p>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <Book className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-900">Documentation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete guides and API documentation
          </p>
          <span className="text-blue-600 text-xs mt-3 flex items-center gap-1">
            Learn more <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        <a
          href="https://video.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <Video className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-900">Video Tutorials</h3>
          <p className="text-sm text-gray-600 mt-1">
            Step-by-step video guides and walkthroughs
          </p>
          <span className="text-blue-600 text-xs mt-3 flex items-center gap-1">
            Watch now <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        <button
          onClick={onContactSupport}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group text-left"
        >
          <MessageCircle className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-900">Contact Support</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get help from our support team
          </p>
          <span className="text-blue-600 text-xs mt-3 flex items-center gap-1">
            Get support <ExternalLink className="w-3 h-3" />
          </span>
        </button>
      </div>

      {/* Guides Section */}
      {guides && guides.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Getting Started Guides
            </h2>
          </div>

          {!activeGuide ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {guides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuide(guide.id)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {guide.title}
                    </h3>
                    <span className="text-xl">{guide.icon}</span>
                  </div>
                  <p className="text-sm text-gray-600">{guide.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <button
                onClick={() => setActiveGuide(null)}
                className="text-blue-600 text-sm font-semibold mb-4 hover:text-blue-700"
              >
                ← Back to Guides
              </button>
              {guides.find((g) => g.id === activeGuide) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {guides.find((g) => g.id === activeGuide)?.title}
                  </h2>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {guides.find((g) => g.id === activeGuide)?.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAQ Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Frequently Asked Questions
          </h2>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  !selectedCategory
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category ? null : category
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Items */}
        <div className="divide-y divide-gray-200">
          {filteredFAQs && filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => (
              <div key={faq.id} className="p-6 hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full flex items-start justify-between gap-4 text-left"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-left">
                      {faq.question}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{faq.category}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                      expandedFAQ[faq.id] ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedFAQ[faq.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {faq.answer}
                    </p>
                    {faq.helpful_count !== undefined && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {faq.helpful_count} found this helpful
                        </p>
                        <div className="flex gap-2">
                          <button className="text-xs text-gray-500 hover:text-green-600 font-semibold px-2 py-1">
                            👍 Helpful
                          </button>
                          <button className="text-xs text-gray-500 hover:text-red-600 font-semibold px-2 py-1">
                            👎 Not helpful
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No FAQs found matching your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Support Contact */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <MessageCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Still need help?</h3>
            <p className="text-sm text-blue-800 mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onContactSupport}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </button>
              <a
                href="mailto:support@example.com"
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
