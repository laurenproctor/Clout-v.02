import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface OutputReadyProps {
  outputId: string
  outputTitle: string
  outputBody: string
  appUrl: string
}

function OutputReadyEmail({ outputId, outputTitle, outputBody, appUrl }: OutputReadyProps) {
  return (
    <Html>
      <Head />
      <Preview>{outputTitle} — your output is ready to review.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Your output is ready.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 8px', fontWeight: '500' }}>
            {outputTitle}
          </Text>
          <Text style={{ color: '#52525b', fontSize: '14px', lineHeight: '22px', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }}>
            {outputBody}
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/studio/${outputId}`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Review in Studio →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You&apos;re receiving this because an output was approved in your Clout workspace.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: OutputReadyProps): Promise<string> {
  return render(<OutputReadyEmail {...props} />)
}

export function renderText({ outputTitle, outputBody, outputId, appUrl }: OutputReadyProps): string {
  return `Your output is ready.

${outputTitle}

${outputBody}

Review in Studio: ${appUrl}/studio/${outputId}
`
}
