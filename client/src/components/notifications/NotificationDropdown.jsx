import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Loader2, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import useNotificationStore from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";

const NotificationDropdown = () => {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    loadMore,
    hasMore,
    isLoadingMore,
    markAsRead,
    initRealtime,
    isInitialized,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      fetchNotifications();
      initRealtime();
    }
  }, [isInitialized, fetchNotifications, initRealtime]);

  // Only closes the dropdown when the click is also navigating away (View
  // Details) — marking a single item read in place must keep the list open,
  // otherwise every "mark as read" click reads as the whole list vanishing.
  const handleViewDetails = (id) => {
    markAsRead(id);
    setIsOpen(false);
  };

  const getLinkHref = (metadata) => {
    if (!metadata) return null;
    switch (metadata.entityType) {
      case "ADMISSION":
        return `/admissions/${metadata.entityId}`;
      case "PATIENT":
        return `/patients/${metadata.entityId}`;
      case "ALERT":
        // There is no standalone /alerts/:id route — an alert is viewed on
        // its admission's Alerts tab, same destination pattern as a treatment
        // approval notification below.
        return metadata.admissionId
          ? `/patients/${metadata.admissionId}/alerts`
          : null;
      case "TREATMENT_APPROVAL":
        return metadata.admissionId
          ? `/patients/${metadata.admissionId}/treatment-approvals`
          : null;
      case "PASSWORD_RESET_REQUEST":
        // Resolving these lives on the admin's Settings page, not a
        // per-request route — every admin notification lands the same place.
        return "/settings";
      default:
        return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}>
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-muted-foreground"
              onClick={() => {
                notifications
                  .filter((n) => n.status === "UNREAD")
                  .forEach((n) => markAsRead(n.id));
              }}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const href = getLinkHref(notification.metadata);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex flex-col p-4 border-b border-border transition-colors hover:bg-muted/50",
                      notification.status === "UNREAD" ? "bg-primary/5" : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      {href ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => handleViewDetails(notification.id)}
                          render={<Link to={href} />}
                        >
                          View Details
                        </Button>
                      ) : (
                        <div />
                      )}
                      {notification.status === "UNREAD" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
