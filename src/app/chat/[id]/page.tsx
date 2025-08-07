"use client";

import { useParams } from 'next/navigation';
import ChatComponent from '../../../components/ChatComponent';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  return <ChatComponent initialChatId={chatId} />;
}