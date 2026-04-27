"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import { sendAlimtalkAction } from "@/lib/actions/notifications";
import { formatPhone } from "@/lib/format";

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [templateCode, setTemplateCode] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState("");
  const [altMessage, setAltMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      const result = await sendAlimtalkAction(idToken, {
        templateCode: templateCode.trim(),
        receiverPhone: receiverPhone.replace(/-/g, ""),
        receiverName: receiverName.trim() || undefined,
        message: message.trim(),
        altMessage: altMessage.trim() || undefined,
      });
      if (result.success) {
        toast.success(result.message);
        setMessage("");
        setAltMessage("");
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "발송 실패");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Bell className="size-5 text-brand-pink" />
        알림톡 발송
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        팝빌 카카오톡 알림톡 단건 발송. 템플릿 사전 등록 필수.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">단건 발송</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label>템플릿 코드</Label>
              <Input
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                placeholder="팝빌에서 발급받은 템플릿 코드"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>수신 번호</Label>
                <Input
                  type="tel"
                  value={receiverPhone}
                  onChange={(e) =>
                    setReceiverPhone(formatPhone(e.target.value))
                  }
                  placeholder="010-1234-5678"
                  maxLength={13}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>수신자 이름 (선택)</Label>
                <Input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>메시지 (템플릿 본문)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="템플릿에 등록된 본문과 일치해야 발송됩니다."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>대체 SMS 메시지 (선택)</Label>
              <Textarea
                value={altMessage}
                onChange={(e) => setAltMessage(e.target.value)}
                rows={3}
                placeholder="알림톡 미수신 시 SMS 로 발송될 메시지"
              />
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? "발송 중…" : "발송"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">참고</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              팝빌 환경변수 (POPBILL_LINKID/SECRETKEY/USERID/SENDER_PHONE) 가 모두 채워져 있어야 발송됩니다.
            </li>
            <li>
              템플릿은 팝빌 사이트에서 사전 등록 + 카카오 채널 승인 후 사용 가능.
            </li>
            <li>
              운영 단계에서는 자동 알림 (주문 완료, 배송 시작 등) 이 결제 콜백/주문 상태 변경에서 자동 발송되도록 추가 예정.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
