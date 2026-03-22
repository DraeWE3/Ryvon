import {
  FileText,
  Mail,
  Calendar,
  Webhook,
  Brain,
  FileSearch,
  ScanText,
  Image,
  GitFork,
  Timer,
  XCircle,
  Shuffle,
  MessageSquare,
  Ticket,
  Trello,
  Send,
} from "lucide-react";

export interface NodeTemplate {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string; // lucide icon name
  color: string;
  defaultData: Record<string, any>;
}

export const NODE_CATEGORIES = [
  {
    name: "Triggers",
    icon: "Zap",
    color: "#8cdff4",
    items: [
      {
        id: "form_submitted",
        label: "Form Submitted",
        description: "Classify form submitted message",
        icon: "FileText",
        color: "#8cdff4",
        defaultData: { formId: "" },
      },
      {
        id: "new_email",
        label: "New Email",
        description: "Triggered on incoming email",
        icon: "Mail",
        color: "#8cdff4",
        defaultData: { mailbox: "inbox" },
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "Run on a cron schedule",
        icon: "Calendar",
        color: "#8cdff4",
        defaultData: { cron: "0 8 * * *" },
      },
      {
        id: "webhook",
        label: "Webhook",
        description: "Triggered by external webhook",
        icon: "Webhook",
        color: "#8cdff4",
        defaultData: { event: "" },
      },
    ],
  },
  {
    name: "AI Processing",
    icon: "Brain",
    color: "#a78bfa",
    items: [
      {
        id: "classify_request",
        label: "Classify Request",
        description: "Classify urgency and topic using NLP",
        icon: "Brain",
        color: "#a78bfa",
        defaultData: { model: "gpt-4" },
      },
      {
        id: "summarize_text",
        label: "Summarize Text",
        description: "Generate a concise summary",
        icon: "FileSearch",
        color: "#a78bfa",
        defaultData: { maxLength: 200 },
      },
      {
        id: "extract_entities",
        label: "Extract Entities",
        description: "Pull names, dates, and values",
        icon: "ScanText",
        color: "#a78bfa",
        defaultData: {},
      },
      {
        id: "image_analysis",
        label: "Image Analysis",
        description: "Analyze image content with AI",
        icon: "Image",
        color: "#a78bfa",
        defaultData: {},
      },
    ],
  },
  {
    name: "Actions",
    icon: "Zap",
    color: "#34d399",
    items: [
      {
        id: "condition",
        label: "Condition (IF)",
        description: "Branch flow based on condition",
        icon: "GitFork",
        color: "#34d399",
        defaultData: { condition: "" },
      },
      {
        id: "wait",
        label: "Wait",
        description: "Pause execution for duration",
        icon: "Timer",
        color: "#34d399",
        defaultData: { duration: "5m" },
      },
      {
        id: "end_flow",
        label: "End Flow",
        description: "Terminate the workflow",
        icon: "XCircle",
        color: "#34d399",
        defaultData: {},
      },
      {
        id: "transform_data",
        label: "Transform Data",
        description: "Map and reshape data",
        icon: "Shuffle",
        color: "#34d399",
        defaultData: { template: "" },
      },
    ],
  },
  {
    name: "Integrations",
    icon: "Globe",
    color: "#60a5fa",
    items: [
      {
        id: "slack_notification",
        label: "Slack Notification",
        description: "Send message to Slack channel",
        icon: "MessageSquare",
        color: "#60a5fa",
        defaultData: { channel: "#general", message: "" },
      },
      {
        id: "jira_ticket",
        label: "Jira Ticket",
        description: "Create an issue in JIRA",
        icon: "Ticket",
        color: "#60a5fa",
        defaultData: { project: "", issueType: "Task" },
      },
      {
        id: "trello_card",
        label: "Trello Card",
        description: "Create and manage Trello Card",
        icon: "Trello",
        color: "#60a5fa",
        defaultData: { board: "", list: "" },
      },
      {
        id: "discord_message",
        label: "Discord Message",
        description: "Send message to Discord",
        icon: "Send",
        color: "#60a5fa",
        defaultData: { channelId: "", message: "" },
      },
    ],
  },
];
