import { Settings2, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useVoiceStore } from '@/store/voiceStore';
import { SPEECH_LANGUAGE } from '../../hooks/useVoiceAgent';

/** Sample line used by the preview button — short, and recognisably clinical. */
const PREVIEW_TEXT =
  'Voice output is working. Blood pressure is 118 over 76, heart rate 82, oxygen saturation 97 percent.';

/**
 * Voice preferences: which voice reads answers, how fast, and whether answers
 * are read automatically.
 *
 * The installed voice list differs per machine and per browser, so it is read
 * from the engine rather than hard-coded — and a saved voice that this machine
 * does not have quietly falls back to the platform default.
 *
 * `triggerClassName` exists because this sits on two surfaces with different
 * palettes: the assistant page's card and the dashboard's brand-coloured one.
 */
export default function VoiceSettingsPopover({ voices, ttsSupported, onPreview, triggerClassName }) {
  const { autoSpeak, setAutoSpeak, voiceURI, setVoiceURI, rate, setRate } = useVoiceStore();

  // Voices for languages nobody on this machine speaks are noise; keep the ones
  // matching the browser's locale, and fall back to the full list when that
  // filter would empty the picker.
  const languagePrefix = SPEECH_LANGUAGE.split('-')[0];
  const matching = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(languagePrefix));
  const options = matching.length > 0 ? matching : voices;

  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI) || null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="Voice settings"
            aria-label="Voice settings"
            className={triggerClassName || 'h-8 w-8 shrink-0'}
          />
        }
      >
        <Settings2 size={15} />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3 p-1">
          <div>
            <h3 className="font-display text-xs font-bold text-foreground">Voice settings</h3>
            <p className="mt-0.5 font-sans text-[10px] leading-relaxed text-muted-foreground">
              Speech is processed by your browser on this device — no audio is sent to the server.
            </p>
          </div>

          {/* Read answers aloud automatically */}
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="voice-auto-speak"
              className="font-sans text-xs font-normal text-foreground"
            >
              Read answers aloud
              <span className="block font-sans text-[10px] text-muted-foreground">
                Speaks every new answer automatically
              </span>
            </Label>
            <Switch
              id="voice-auto-speak"
              checked={autoSpeak}
              onCheckedChange={setAutoSpeak}
              disabled={!ttsSupported}
            />
          </div>

          {/* Synthesis voice */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voice-name" className="font-sans text-xs font-normal">
              Answer voice
            </Label>
            <Select
              value={selectedVoice ? selectedVoice.voiceURI : 'default'}
              onValueChange={(value) => setVoiceURI(value === 'default' ? null : value)}
            >
              <SelectTrigger id="voice-name" className="h-8 w-full font-sans text-xs">
                <SelectValue placeholder="System default">
                  {selectedVoice ? selectedVoice.name : 'System default'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="default" className="text-xs">
                  System default
                </SelectItem>
                {options.map((voice) => (
                  <SelectItem key={voice.voiceURI} value={voice.voiceURI} className="text-xs">
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-rate" className="font-sans text-xs font-normal">
                Speaking speed
              </Label>
              <span className="font-tnum text-[10px] text-muted-foreground">
                {rate.toFixed(2)}×
              </span>
            </div>
            <input
              id="voice-rate"
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview?.(PREVIEW_TEXT)}
            disabled={!ttsSupported}
            className="h-7 w-full gap-1.5 font-sans text-xs"
          >
            <Volume2 size={13} />
            Preview voice
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
