import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { db } from "~/.server/db";

// API Key for Claude/programmatic access
const API_KEY = process.env.CLAUDE_API_KEY || process.env.LEADMAGNET_API_KEY;

// Validate API key from headers
function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !API_KEY) return false;
  return apiKey === API_KEY;
}

/**
 * GET /api/leadmagnets - List all lead magnets
 * Requires x-api-key header
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!validateApiKey(request)) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "true";

  const leadMagnets = await db.leadMagnet.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      heroTitle: true,
      tagOnDownload: true,
      downloadCount: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return data({ leadMagnets });
};

/**
 * POST /api/leadmagnets - Create a new lead magnet
 * Requires x-api-key header
 *
 * Body:
 * {
 *   slug: string (required)
 *   title: string (required)
 *   s3Key: string (required)
 *   heroTitle: string (required)
 *   tagOnDownload: string (required)
 *   description?: string
 *   heroSubtitle?: string
 *   coverImage?: string
 *   primaryColor?: string (default: #CA9B77)
 *   secondaryColor?: string (default: #845A8F)
 *   bgPattern?: string (default: gradient)
 *   ctaText?: string (default: Descargar ahora)
 *   inputPlaceholder?: string (default: tu@email.com)
 *   successTitle?: string (default: ¡Listo!)
 *   successMessage?: string
 *   sequenceId?: string
 *   urlExpirationHours?: number (default: 24)
 *   isActive?: boolean (default: true)
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (!validateApiKey(request)) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();

      // Validate required fields
      const { slug, title, s3Key, heroTitle, tagOnDownload } = body;

      if (!slug || !title || !s3Key || !heroTitle || !tagOnDownload) {
        return data(
          {
            error: "Missing required fields",
            required: ["slug", "title", "s3Key", "heroTitle", "tagOnDownload"],
          },
          { status: 400 }
        );
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return data(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        );
      }

      // Check if slug already exists
      const existing = await db.leadMagnet.findUnique({
        where: { slug },
      });

      if (existing) {
        return data({ error: "A lead magnet with this slug already exists" }, { status: 409 });
      }

      // Create lead magnet
      const leadMagnet = await db.leadMagnet.create({
        data: {
          slug,
          title,
          description: body.description || null,
          s3Key,
          fileName: body.fileName || null,
          fileType: body.fileType || null,
          heroTitle,
          heroSubtitle: body.heroSubtitle || null,
          coverImage: body.coverImage || null,
          primaryColor: body.primaryColor || "#CA9B77",
          secondaryColor: body.secondaryColor || "#845A8F",
          bgPattern: body.bgPattern || "gradient",
          layout: body.layout || "centered",
          ctaText: body.ctaText || "Descargar ahora",
          inputPlaceholder: body.inputPlaceholder || "tu@email.com",
          successTitle: body.successTitle || "¡Listo!",
          successMessage: body.successMessage || "Revisa tu email para descargar",
          showFooter: body.showFooter !== false,
          footerText: body.footerText || null,
          tagOnDownload,
          sequenceId: body.sequenceId || null,
          urlExpirationHours: body.urlExpirationHours || 24,
          isActive: body.isActive !== false,
        },
      });

      return data({
        success: true,
        message: "Lead magnet created successfully",
        leadMagnet: {
          id: leadMagnet.id,
          slug: leadMagnet.slug,
          title: leadMagnet.title,
          url: `https://www.fixtergeek.com/descarga/${leadMagnet.slug}`,
        },
      });
    } catch (error) {
      console.error("[API LeadMagnets] Error creating lead magnet:", error);
      return data({ error: "Failed to create lead magnet" }, { status: 500 });
    }
  }

  if (request.method === "PATCH") {
    try {
      const body = await request.json();
      const { id, slug, ...updates } = body;

      if (!id && !slug) {
        return data({ error: "Either id or slug is required" }, { status: 400 });
      }

      const where = id ? { id } : { slug };

      const existing = await db.leadMagnet.findUnique({ where });

      if (!existing) {
        return data({ error: "Lead magnet not found" }, { status: 404 });
      }

      const leadMagnet = await db.leadMagnet.update({
        where,
        data: updates,
      });

      return data({
        success: true,
        message: "Lead magnet updated successfully",
        leadMagnet: {
          id: leadMagnet.id,
          slug: leadMagnet.slug,
          title: leadMagnet.title,
        },
      });
    } catch (error) {
      console.error("[API LeadMagnets] Error updating lead magnet:", error);
      return data({ error: "Failed to update lead magnet" }, { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    try {
      const body = await request.json();
      const { id, slug } = body;

      if (!id && !slug) {
        return data({ error: "Either id or slug is required" }, { status: 400 });
      }

      const where = id ? { id } : { slug };

      const existing = await db.leadMagnet.findUnique({ where });

      if (!existing) {
        return data({ error: "Lead magnet not found" }, { status: 404 });
      }

      // Delete downloads first
      await db.leadMagnetDownload.deleteMany({
        where: { leadMagnetId: existing.id },
      });

      await db.leadMagnet.delete({ where });

      return data({
        success: true,
        message: "Lead magnet deleted successfully",
      });
    } catch (error) {
      console.error("[API LeadMagnets] Error deleting lead magnet:", error);
      return data({ error: "Failed to delete lead magnet" }, { status: 500 });
    }
  }

  return data({ error: "Method not allowed" }, { status: 405 });
};
