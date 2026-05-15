import TradeTimelineScreen from '@/components/TradeTimelineScreen'

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TradeTimelineScreen entryId={id} />
}
