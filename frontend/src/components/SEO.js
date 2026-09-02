import { useLocation } from "react-router-dom";

const BASE_URL = "https://residentone.app";
const DEFAULT_IMAGE = `${BASE_URL}/logo512.png`;
const SITE_NAME = "ResidentOne";

/**
 * Reusable SEO Component for React 19 Document Metadata
 * Dynamically sets document title, meta tags, OpenGraph, Twitter Cards, Canonical links, and JSON-LD schema.
 */
export default function SEO({
  title,
  description,
  keywords,
  canonicalPath,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  noindex = false,
  schema = null,
}) {
  const location = useLocation();
  const currentPath = canonicalPath || location.pathname;
  const canonicalUrl = `${BASE_URL}${currentPath === "/" ? "" : currentPath}`;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Residential Society Management Platform`;
  const metaDescription =
    description ||
    "ResidentOne is an all-in-one residential society management platform for automated billing, visitor tracking, complaints, notices, and community management.";

  const keywordsString = Array.isArray(keywords)
    ? keywords.join(", ")
    : keywords || "society management, apartment billing, visitor security, resident portal, society accounting";

  const robotsDirective = noindex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  return (
    <>
      {/* Document Title */}
      <title>{fullTitle}</title>

      {/* Primary Meta Tags */}
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywordsString} />
      <meta name="robots" content={robotsDirective} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Cards */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={ogImage} />

      {/* Optional Page-Specific Structured Data */}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </>
  );
}
