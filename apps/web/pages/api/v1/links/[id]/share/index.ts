import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@linkwarden/prisma";
import verifyUser from "@/lib/api/verifyUser";

// Quick share: get a share card for a link, or turn on public sharing
// for the collection the link belongs to so friends can open it.
export default async function share(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  const linkId = Number(req.query.id);
  if (!linkId) return res.status(400).json({ response: "Invalid link." });

  if (req.method === "GET") {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        collection: {
          include: { owner: { select: { name: true, email: true } } },
        },
      },
    });

    if (!link) return res.status(404).json({ response: "Link not found." });

    return res.status(200).json({
      response: {
        title: link.name,
        url: link.url,
        description: link.description,
        collection: link.collection.name,
        sharedBy: link.collection.owner.name,
        contact: link.collection.owner.email,
      },
    });
  } else if (req.method === "POST") {
    const link = await prisma.link.findUnique({ where: { id: linkId } });

    if (!link) return res.status(404).json({ response: "Link not found." });

    const collection = await prisma.collection.update({
      where: { id: link.collectionId },
      data: { isPublic: true },
    });

    return res.status(200).json({
      response: {
        shareUrl: `${process.env.NEXTAUTH_URL}/public/collections/${collection.id}`,
      },
    });
  } else if (req.method === "DELETE") {
    // Stop sharing: remove the shared link
    const link = await prisma.link.findUnique({ where: { id: linkId } });

    if (!link) return res.status(404).json({ response: "Link not found." });

    await prisma.link.delete({ where: { id: linkId } });

    return res.status(200).json({ response: "Link deleted." });
  }

  return res.status(405).json({ response: "Method not allowed." });
}
