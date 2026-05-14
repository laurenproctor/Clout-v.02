import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface WelcomeProps {
  displayName: string
  appUrl: string
}

function WelcomeEmail({ displayName, appUrl }: WelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Clout — let&apos;s turn your ideas into authority content.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Welcome to Clout, {displayName}.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Clout transforms your raw thoughts — voice memos, text dumps, URLs — into polished, publish-ready content that sounds exactly like you.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Start by capturing your first idea.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/capture/new`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Create your first capture →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You&apos;re receiving this because you signed up for Clout.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: WelcomeProps): Promise<string> {
  return render(<WelcomeEmail {...props} />)
}

export function renderText({ displayName, appUrl }: WelcomeProps): string {
  return `Welcome to Clout, ${displayName}.

Clout transforms your raw thoughts into polished, publish-ready content that sounds exactly like you.

Start by capturing your first idea: ${appUrl}/capture/new
`
}
