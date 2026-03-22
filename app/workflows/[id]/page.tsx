import { WorkflowDetailClient } from './client'

export default async function WorkflowDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <WorkflowDetailClient id={params.id} />
}
