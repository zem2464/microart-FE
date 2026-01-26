import { Badge, Tooltip, Spin } from "antd";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const ReminderNoteBadge = ({ notes, loading = false }) => {
  if (!notes || notes.length === 0) {
    return null;
  }

  const unreadCount = notes.filter(
    (note) => !note.seenBy?.some((s) => s.user?.id),
  ).length;
  const hasUnread = unreadCount > 0;

  if (loading) {
    return <Spin size="small" />;
  }

  const tooltipContent = (
    <div style={{ maxWidth: 300 }}>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>
        Reminder Notes ({notes.length})
      </div>
      {notes.map((note, idx) => (
        <div
          key={note.id}
          style={{
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: idx < notes.length - 1 ? "1px solid #ddd" : "none",
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: "bold" }}>
              {note.creator?.firstName} {note.creator?.lastName}
            </span>
            <span style={{ color: "#999", marginLeft: 8 }}>
              {dayjs(note.createdAt).fromNow()}
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#333",
              wordBreak: "break-word",
              marginBottom: 4,
            }}
          >
            {note.content.substring(0, 100)}
            {note.content.length > 100 ? "..." : ""}
          </div>
          {note.seenBy && note.seenBy.length > 0 && (
            <div style={{ fontSize: 11, color: "#666" }}>
              ✓ Marked as seen by {note.seenBy.length} user
              {note.seenBy.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <Badge
        count={hasUnread ? unreadCount : 0}
        style={{
          backgroundColor: hasUnread ? "#ff4d4f" : "#1890ff",
          cursor: "pointer",
        }}
        overflowCount={9}
      >
        <BellOutlined
          style={{
            fontSize: 14,
            color: hasUnread ? "#ff4d4f" : "#1890ff",
            marginRight: 8,
          }}
        />
      </Badge>
    </Tooltip>
  );
};

export default ReminderNoteBadge;
