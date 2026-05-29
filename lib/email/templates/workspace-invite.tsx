import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface WorkspaceInviteProps {
  workspaceName: string
  invitedByName: string
  role: string
  inviteUrl: string
}

function WorkspaceInviteEmail({ workspaceName, invitedByName, role, inviteUrl }: WorkspaceInviteProps) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  return (
    <Html>
      <Head />
      <Preview>{invitedByName} invited you to join {workspaceName} on Clout.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            You&apos;ve been invited to join {workspaceName}
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            {invitedByName} has invited you to join <strong>{workspaceName}</strong> on Clout as a <strong>{roleLabel}</strong>.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={inviteUrl}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Accept invitation →
            </Button>
          </Section>
          <Text style={{ color: '#71717a', fontSize: '13px', lineHeight: '20px', margin: '0 0 24px' }}>
            Or copy this link into your browser:
          </Text>
          <Text style={{ color: '#3f3f46', fontSize: '13px', lineHeight: '20px', margin: '0 0 24px', wordBreak: 'break-all' as const }}>
            {inviteUrl}
          </Text>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            This invite expires in 7 days. If you weren&apos;t expecting this invitation, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: WorkspaceInviteProps): Promise<string> {
  return render(<WorkspaceInviteEmail {...props} />)
}

export function renderText({ workspaceName, invitedByName, role, inviteUrl }: WorkspaceInviteProps): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  return `You've been invited to join ${workspaceName} on Clout.

${invitedByName} has invited you to join ${workspaceName} as a ${roleLabel}.

Accept your invitation: ${inviteUrl}

This invite expires in 7 days. If you weren't expecting this, you can ignore this email.
`
}
