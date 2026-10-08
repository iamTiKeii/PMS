import prisma from "@/lib/prisma";

export type RequestEventCode =
  | "REQUEST_CREATED"
  | "REQUEST_UPDATED"
  | "REQUEST_ASSIGNED"
  | "REQUEST_UNASSIGNED"
  | "REQUEST_STATUS_CHANGED"
  | "REQUEST_DUE_DATE_CHANGED"
  | "REQUEST_JIRA_CHANGED"
  | "REQUEST_DUE_SOON"
  | "REQUEST_DUE_TODAY"
  | "REQUEST_OVERDUE"
  | "REQUEST_COMPLETED"
  | "REQUEST_REOPENED"
  | "REQUEST_DELETED";

export interface LogActivityParams {
  requestId: string;
  eventCode: RequestEventCode;
  actorId?: string | null;
  actorName?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  eventTime?: Date;
}

export async function logRequestActivity(params: LogActivityParams) {
  try {
    const {
      requestId,
      eventCode,
      actorId = null,
      actorName = "Hệ thống",
      title,
      description = null,
      metadata = null,
      eventTime = new Date(),
    } = params;

    return await prisma.projectRequestActivity.create({
      data: {
        requestId,
        eventCode,
        actorId,
        actorName,
        title,
        description,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        eventTime,
      },
    });
  } catch (error) {
    console.error("Failed to log request activity:", error);
    return null;
  }
}

export async function getRequestActivities(requestId: string) {
  try {
    const activities = await prisma.projectRequestActivity.findMany({
      where: { requestId },
      orderBy: { eventTime: "desc" },
    });

    return activities.map((item) => ({
      ...item,
      metadata: item.metadataJson ? safeParseJson(item.metadataJson) : null,
    }));
  } catch (error) {
    console.error("Failed to fetch request activities:", error);
    return [];
  }
}

function safeParseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
