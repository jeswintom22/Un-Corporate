export const RISK_CATEGORIES = [
  { id: "data_collection", displayName: "Data Collection", shortLabel: "DATA SCOOP", pixelIcon: "db", description: "Terms about what data is collected." },
  { id: "data_retention", displayName: "Data Retention", shortLabel: "DATA STASH", pixelIcon: "archive", description: "Terms describing how long user information may be stored." },
  { id: "data_sharing", displayName: "Data Sharing", shortLabel: "DATA PASS", pixelIcon: "share", description: "Terms about sharing data with outside parties." },
  { id: "tracking_profiling", displayName: "Tracking and Profiling", shortLabel: "TRACK STACK", pixelIcon: "target", description: "Tracking and behavioral profiling terms." },
  { id: "content_license", displayName: "Content License", shortLabel: "LICENSE DROP", pixelIcon: "license", description: "Rights granted by users over their content." },
  { id: "content_ownership", displayName: "Content Ownership", shortLabel: "WHO OWNS WHAT", pixelIcon: "crown", description: "Ownership terms for uploaded or created content." },
  { id: "automatic_renewal", displayName: "Automatic Renewal", shortLabel: "AUTO-PAY JUMPSCARE", pixelIcon: "refresh", description: "Subscription renewal terms." },
  { id: "billing_payment", displayName: "Billing and Payment", shortLabel: "PAYMENT RULES", pixelIcon: "card", description: "Billing terms and payment conditions." },
  { id: "cancellation", displayName: "Cancellation", shortLabel: "EXIT QUEST", pixelIcon: "x", description: "How users can cancel and related constraints." },
  { id: "refunds", displayName: "Refunds", shortLabel: "MONEY BACK?", pixelIcon: "coin", description: "Refund eligibility and limitations." },
  { id: "account_termination", displayName: "Account Termination", shortLabel: "ACCOUNT YEET", pixelIcon: "power", description: "How accounts can be suspended or terminated." },
  { id: "policy_changes", displayName: "Policy Changes", shortLabel: "RULE PATCHES", pixelIcon: "edit", description: "How and when policy terms can change." },
  { id: "mandatory_arbitration", displayName: "Mandatory Arbitration", shortLabel: "PRIVATE COURT MODE", pixelIcon: "gavel", description: "Arbitration requirements and dispute handling." },
  { id: "class_action_waiver", displayName: "Class Action Waiver", shortLabel: "NO GROUP FIGHT", pixelIcon: "users", description: "Limits on class or collective claims." },
  { id: "rights_waiver", displayName: "Rights Waiver", shortLabel: "RIGHTS TRADE", pixelIcon: "flag", description: "Waiver of legal or user rights." },
  { id: "liability_limitation", displayName: "Liability Limitation", shortLabel: "NOT OUR FAULT", pixelIcon: "shield", description: "Limits on provider liability." },
  { id: "indemnification", displayName: "Indemnification", shortLabel: "YOU PAY IF", pixelIcon: "briefcase", description: "User responsibility for provider legal costs." },
  { id: "employment_restriction", displayName: "Employment Restriction", shortLabel: "WORK LOCK", pixelIcon: "lock", description: "Employment restrictions and constraints." },
  { id: "non_compete", displayName: "Non-Compete", shortLabel: "NO RIVAL MODE", pixelIcon: "ban", description: "Limits on competing activities." },
  { id: "confidentiality", displayName: "Confidentiality", shortLabel: "KEEP IT QUIET", pixelIcon: "eye-off", description: "Confidentiality and nondisclosure terms." },
  { id: "monitoring", displayName: "Monitoring", shortLabel: "WATCH MODE", pixelIcon: "eye", description: "Monitoring of accounts, activity, or communications." },
  { id: "user_obligations", displayName: "User Obligations", shortLabel: "YOU MUST", pixelIcon: "list", description: "User responsibilities and compliance requirements." },
  { id: "third_party_services", displayName: "Third-Party Services", shortLabel: "OUTSIDE CREW", pixelIcon: "link", description: "Dependencies on third-party services and policies." },
  { id: "jurisdiction", displayName: "Jurisdiction", shortLabel: "WHERE IT GOES", pixelIcon: "map", description: "Governing law and jurisdiction terms." },
  { id: "age_eligibility", displayName: "Age Eligibility", shortLabel: "AGE GATE", pixelIcon: "id", description: "Age requirements and eligibility constraints." },
  { id: "other_user_impact", displayName: "Other User Impact", shortLabel: "OTHER SUS", pixelIcon: "alert", description: "Other meaningful user-impacting clauses." },
];

export const CATEGORY_MAP = Object.fromEntries(RISK_CATEGORIES.map((category) => [category.id, category]));

export function isAllowedCategory(id) {
  return Boolean(CATEGORY_MAP[id]);
}
