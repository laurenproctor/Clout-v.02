import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface PaymentFailedProps {
  planName: string
  amount: number
  currency: string
  gracePeriodDays: number
  appUrl: string
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function PaymentFailedEmail({ planName, amount, currency, gracePeriodDays, appUrl }: PaymentFailedProps) {
  const formatted = formatAmount(amount, currency)
  return (
    <Html>
      <Head />
      <Preview>Action required — your {planName} payment of {formatted} failed.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Action required: payment failed.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 8px' }}>
            We weren&apos;t able to process your <strong>{planName}</strong> payment of <strong>{formatted}</strong>.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Your access continues for <strong>{gracePeriodDays} days</strong>. Please update your billing details before then to avoid interruption.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/billing`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Update billing details →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You&apos;re receiving this because a payment failed on your Clout subscription.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: PaymentFailedProps): Promise<string> {
  return render(<PaymentFailedEmail {...props} />)
}

export function renderText({ planName, amount, currency, gracePeriodDays, appUrl }: PaymentFailedProps): string {
  const formatted = formatAmount(amount, currency)
  return `Action required: payment failed.

We weren't able to process your ${planName} payment of ${formatted}.

Your access continues for ${gracePeriodDays} days. Please update your billing details before then.

Update billing details: ${appUrl}/billing
`
}
