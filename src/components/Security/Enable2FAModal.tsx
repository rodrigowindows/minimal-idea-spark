import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enrollTotp, verifyTotpChallenge } from '@/lib/auth/2fa'
import { toast } from 'sonner'

interface Enable2FAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function Enable2FAModal({ open, onOpenChange, onSuccess }: Enable2FAModalProps) {
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEnroll() {
    setLoading(true)
    const result = await enrollTotp()
    setLoading(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setQrCode(result.qrCode)
    setSecret(result.secret)
    setStep('verify')
  }

  async function handleVerify() {
    if (!code.trim() || code.length < 6) {
      toast.error('Enter the 6-digit code from your app')
      return
    }
    setLoading(true)
    const result = await verifyTotpChallenge(code)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('2FA enabled')
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication (2FA)</DialogTitle>
        </DialogHeader>
        {step === 'enroll' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) or enter the secret manually.
            </p>
            <Button onClick={handleEnroll} disabled={loading}>
              {loading ? 'Generating...' : 'Generate QR code'}
            </Button>
          </>
        ) : (
          <>
            {qrCode && (
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img src={qrCode} alt="QR code for 2FA" width={180} height={180} />
              </div>
            )}
            {secret && (
              <p className="text-xs text-muted-foreground break-all">Secret: {secret}</p>
            )}
            <div className="space-y-2">
              <Label>Verification code</Label>
              <Input
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('enroll')}>Back</Button>
              <Button onClick={handleVerify} disabled={loading || code.length < 6}>
                {loading ? 'Verifying...' : 'Verify and enable'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
