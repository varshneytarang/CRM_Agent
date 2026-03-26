# Frontend Components Documentation

This document provides comprehensive documentation for all frontend components in the CRM Agent application.

## Overview

The frontend is built with React and TypeScript, using TailwindCSS for styling and integrating with the Recharts library for data visualization. All components are reusable, type-safe, and designed to work with the backend API.

## Core Components

### 1. SignalMonitor

**Purpose**: Displays engagement signals (email opens, clicks, replies, bounces, unsubscribes) from email tracking providers.

**Location**: `src/components/SignalMonitor.tsx`

**Key Features**:
- Groups signals by prospect email
- Color-coded event types with icons
- Detailed event data expandable view
- Summary statistics showing event counts
- Refresh functionality for real-time updates

**Props**:
```typescript
interface SignalMonitorProps {
  signals: EngagementSignal[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

interface EngagementSignal {
  id: string;
  userid: string;
  lead_email: string;
  event_type: string; // "open" | "click" | "reply" | "bounce" | "unsubscribe"
  event_data: Record<string, any>;
  provider: string; // "gmail", "outlook", etc.
  timestamp: string;
  created_at: string;
}
```

**Usage**:
```tsx
import { SignalMonitor } from './components';

<SignalMonitor
  signals={engagementSignals}
  loading={isLoading}
  onRefresh={async () => {
    // Fetch latest signals
  }}
/>
```

---

### 2. ProspectList

**Purpose**: Displays a list of prospects with detailed information, status tracking, and engagement metrics.

**Location**: `src/components/ProspectList.tsx`

**Key Features**:
- Expandable prospect details
- Status badges (new, contacted, engaged, qualified, lost)
- Fit score visualization
- Contact information management
- Edit and delete functionality
- Quick selection for engagement

**Props**:
```typescript
interface ProspectListProps {
  prospects: Prospect[];
  loading?: boolean;
  onSelect?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => Promise<void>;
  onEdit?: (prospect: Prospect) => void;
  selectedProspectId?: string;
}

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  status: "new" | "contacted" | "engaged" | "qualified" | "lost";
  fit_score?: number;
  last_engagement?: string;
  tags?: string[];
}
```

**Usage**:
```tsx
import { ProspectList } from './components';

<ProspectList
  prospects={prospects}
  onSelect={(prospect) => {
    // Handle prospect selection for engagement
  }}
  onEdit={(prospect) => {
    // Open edit dialog
  }}
  onDelete={async (prospectId) => {
    // Delete prospect from backend
  }}
  selectedProspectId={selectedId}
/>
```

---

### 3. PipelineView

**Purpose**: Visualizes the sales pipeline with stage distribution, conversion rates, and key metrics.

**Location**: `src/components/PipelineView.tsx`

**Key Features**:
- Key metrics cards (prospects, qualified leads, conversion rate)
- Stage distribution visualization
- Pipeline flow with percentage breakdown
- Detailed stage statistics table
- Velocity and conversion tracking

**Props**:
```typescript
interface PipelineViewProps {
  metrics?: PipelineMetrics;
  loading?: boolean;
}

interface PipelineMetrics {
  total_prospects: number;
  qualified_leads: number;
  conversion_rate: number;
  average_deal_size?: number;
  average_sales_cycle?: number;
  stages: PipelineStage[];
}

interface PipelineStage {
  name: string;
  count: number;
  color: string; // Tailwind color class like "bg-blue-500"
  percentage?: number;
}
```

**Usage**:
```tsx
import { PipelineView } from './components';

<PipelineView
  metrics={{
    total_prospects: 150,
    qualified_leads: 45,
    conversion_rate: 0.30,
    average_deal_size: 50000,
    average_sales_cycle: 30,
    stages: [
      { name: "Leads", count: 80, color: "bg-blue-500" },
      { name: "Conversations", count: 40, color: "bg-purple-500" },
      { name: "Proposals", count: 20, color: "bg-green-500" }
    ]
  }}
/>
```

---

### 4. EmailTemplateBuilder

**Purpose**: Create, edit, and manage email templates with variable substitution support.

**Location**: `src/components/EmailTemplateBuilder.tsx`

**Key Features**:
- Create and edit templates
- Variable detection and management (using `{{variable_name}}` syntax)
- Live preview functionality
- Copy-to-clipboard for template body
- Template deletion with confirmation
- List of all saved templates

**Props**:
```typescript
interface EmailTemplateBuilderProps {
  templates: EmailTemplate[];
  loading?: boolean;
  onSave?: (template: Partial<EmailTemplate>) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
  onSelect?: (template: EmailTemplate) => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  created_at: string;
  last_modified: string;
}
```

**Usage**:
```tsx
import { EmailTemplateBuilder } from './components';

<EmailTemplateBuilder
  templates={templates}
  onSave={async (template) => {
    // Save template to backend
  }}
  onDelete={async (templateId) => {
    // Delete template from backend
  }}
  onSelect={(template) => {
    // Handle template selection
  }}
/>
```

**Variable Syntax**:
- Use `{{first_name}}`, `{{company}}``, `{{title}}` etc. in templates
- Variables are automatically detected
- Variables are replaced during email sending

---

### 5. SettingsPanel

**Purpose**: Manages user settings, integrations, notifications, and security configurations.

**Location**: `src/components/SettingsPanel.tsx`

**Key Features**:
- Profile settings (name, company, phone, timezone)
- Integration management (connect/disconnect services)
- Notification preferences
- Security options (password change, 2FA, logout)
- Tabbed interface for organization

**Props**:
```typescript
interface SettingsProps {
  userSettings?: UserSettings;
  integrations?: Integration[];
  loading?: boolean;
  onSaveSettings?: (settings: UserSettings) => Promise<void>;
  onToggleIntegration?: (integrationId: string) => Promise<void>;
  onLogout?: () => Promise<void>;
}

interface UserSettings {
  user_id: string;
  email: string;
  full_name: string;
  company: string;
  phone?: string;
  timezone?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  weekly_digest: boolean;
  auto_engagement: boolean;
  auto_engagement_delay?: number;
}

interface Integration {
  id: string;
  name: string;
  type: "email" | "calendar" | "crm" | "ai";
  status: "connected" | "disconnected" | "error";
  connected_at?: string;
  last_synced?: string;
  error_message?: string;
}
```

**Usage**:
```tsx
import { SettingsPanel } from './components';

<SettingsPanel
  userSettings={userSettings}
  integrations={integrations}
  onSaveSettings={async (settings) => {
    // Update settings in backend
  }}
  onToggleIntegration={async (integrationId) => {
    // Connect/disconnect integration
  }}
  onLogout={async () => {
    // Logout user
  }}
/>
```

---

### 6. AnalyticsDashboard

**Purpose**: Displays comprehensive analytics and engagement metrics with visualizations.

**Location**: `src/components/AnalyticsDashboard.tsx`

**Key Features**:
- Key metrics cards (emails sent, open rate, click rate, reply rate)
- Engagement trend line chart
- Company engagement comparison
- Job title engagement comparison
- Period selection (7D, 30D, 90D, YTD)
- Export functionality
- Detailed statistics table

**Props**:
```typescript
interface AnalyticsDashboardProps {
  data?: AnalyticsData;
  loading?: boolean;
  onExport?: () => Promise<void>;
  onFilterChange?: (period: string) => Promise<void>;
}

interface AnalyticsData {
  period: string;
  total_emails_sent: number;
  total_opens: number;
  total_clicks: number;
  total_replies: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  trending_data: Array<{
    date: string;
    opens: number;
    clicks: number;
    replies: number;
  }>;
  engagement_by_company: Array<{
    company: string;
    emails: number;
    opens: number;
    clicks: number;
  }>;
  engagement_by_title: Array<{
    title: string;
    opens: number;
    clicks: number;
    replies: number;
  }>;
}
```

**Usage**:
```tsx
import { AnalyticsDashboard } from './components';

<AnalyticsDashboard
  data={analyticsData}
  onFilterChange={async (period) => {
    // Fetch analytics for selected period
  }}
  onExport={async () => {
    // Export analytics as CSV/PDF
  }}
/>
```

---

### 7. HelpCenter

**Purpose**: Provides comprehensive help documentation, FAQs, and support resources.

**Location**: `src/components/HelpCenter.tsx`

**Key Features**:
- FAQ section with category filtering
- Getting started guides
- Search functionality
- Quick links to documentation and video tutorials
- Support contact information
- Helpful feedback tracking

**Props**:
```typescript
interface HelpCenterProps {
  faqs?: FAQItem[];
  guides?: GuideSection[];
  loading?: boolean;
  onContactSupport?: () => void;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful_count?: number;
}

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  related_articles?: string[];
}
```

**Usage**:
```tsx
import { HelpCenter } from './components';

<HelpCenter
  faqs={faqs}
  guides={guides}
  onContactSupport={() => {
    // Open support contact form
  }}
/>
```

---

## Styling

All components use TailwindCSS for styling with a consistent design system:

- **Colors**: Blue for primary actions, green for success, red for danger/errors
- **Typography**: Font sizes and weights follow a standard scale
- **Spacing**: Consistent padding/margin patterns for visual hierarchy
- **Borders**: Subtle 1px borders for component separation
- **Shadows**: Minimal shadows for depth

### Common Tailwind Classes Used

```
px-4 py-2    // Padding
gap-2, gap-4 // Gaps between elements
rounded, rounded-lg // Border radius
bg-white, bg-gray-50 // Backgrounds
text-sm, text-2xl // Font sizes
font-semibold, font-bold // Font weights
hover:, active:, disabled: // State variants
transition-colors, transition-all // Animations
```

---

## Icons

Components use Lucide React icons for consistent iconography:

```tsx
import {
  Mail,
  Eye,
  Link2,
  MessageCircle,
  AlertTriangle,
  LogOut,
  // ... and many more
} from "lucide-react";
```

Common icons:
- `Mail` - Email related
- `Eye` - View/visibility
- `Link2` - Links/clicks
- `MessageCircle` - Messages/replies
- `CheckCircle` - Success/completed
- `AlertCircle` - Warnings/errors

---

## Type Safety

All components are fully typed with TypeScript interfaces. Always import and use the provided types:

```tsx
import { SignalMonitor, type EngagementSignal } from './components';

const signals: EngagementSignal[] = [...];
```

---

## API Integration

Components accept callback functions for backend integration:

```tsx
// Async operations
onSave={async (data) => {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}}

// Loading states
loading={isLoading}

// Error handling
try {
  await onSave(data);
} catch (error) {
  // Handle error
}
```

---

## Responsive Design

All components are responsive:
- **Mobile**: Single column, stacked layouts
- **Tablet**: 2-column grids where appropriate
- **Desktop**: Full layouts with optimal white space

Use Tailwind's responsive prefixes:
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
px-4 md:px-6 lg:px-8
text-sm md:text-base lg:text-lg
```

---

## Best Practices

1. **Props**: Always provide necessary data through props
2. **Callbacks**: Use async callbacks for backend operations
3. **Loading States**: Show loading spinners during async operations
4. **Error Handling**: Wrap async operations in try-catch blocks
5. **Accessibility**: Components include proper ARIA labels
6. **Performance**: Use React.memo or useMemo for expensive operations
7. **Typing**: Always use TypeScript imports for types

---

## Integration Checklist

When integrating a component:

- [ ] Import component and types
- [ ] Fetch/prepare required data
- [ ] Implement callback handlers
- [ ] Handle loading and error states
- [ ] Connect to backend API
- [ ] Test user interactions
- [ ] Verify responsive behavior

---

## Common Patterns

### Loading State
```tsx
{loading ? (
  <div className="text-gray-500">Loading...</div>
) : (
  <Component data={data} />
)}
```

### Error Handling
```tsx
{saveStatus === "success" && (
  <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
    <CheckCircle className="w-5 h-5 text-green-600" />
    <span className="text-sm text-green-700">Success message</span>
  </div>
)}
```

### Form Submission
```tsx
const handleSubmit = async () => {
  try {
    await onSave(formData);
    setSaveStatus("success");
  } catch (error) {
    setSaveStatus("error");
  }
};
```

---

## Component Dependencies

All components have minimal dependencies:
- React 18+
- TypeScript 4.9+
- TailwindCSS 3.3+
- Lucide React (icons)
- Recharts (analytics visualizations)

---

## Future Enhancements

Potential improvements:
- [ ] Dark mode support
- [ ] Animation libraries (Framer Motion)
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Storybook integration
- [ ] Component testing with Vitest
- [ ] Export/PDF functionality
- [ ] Real-time updates with WebSockets

---

## Support

For component-specific issues or questions:
1. Check TypeScript types for required props
2. Review usage examples in documentation
3. Inspect browser DevTools for rendering issues
4. Check browser console for error messages
