# Design: a private journal and a social app in one

*Working notes, 2026-11-13. This is the design thinking for how the two
halves of Photo Diary fit together. Nothing here is built yet except the
private diary core (calendar, daily photos, writing).*

## The tension

A journal only works if it's completely private — you write honestly
because nobody will ever read it. A social app only works if things get
published and curated. Putting both in one app threatens both: if the
journal feels watched, the writing dies; if sharing is effortful and
rare, the social side dies.

## The principle that resolves it

**Private by default; sharing is a separate, deliberate publishing act —
and what gets published is photos, never text.**

- The diary entry (text) is *architecturally* private, not just hidden:
  shared views are built from photo records only, and the text field is
  never included in anything sent to another user — not "hidden in the
  UI", absent from the data.
- A photo starts life private. It becomes visible to friends/public only
  when its owner explicitly includes it while finalizing a day.
- There is no global "make my diary public" switch and never will be.
  Visibility is per photo, chosen per day, defaulting to private.

## One object, three states: the Day

Everything is built around a single unit — one person's one day — which
moves through three states:

1. **Collecting** (all day, private). As you take photos you can drop
   them into today's "tray" in the moment. Nothing is posted, nobody can
   see anything, there's nothing to perform. Adding a photo during the
   day is *capture*, not publishing.
2. **Reflected** (whenever you're ready, private). You look back at the
   tray: reorder, pick the day's cover, add captions, write the entry.
   The writing is the reflection step, and it's what the journal is for.
3. **Finalized / shared** (one deliberate tap). You confirm the day is
   done and choose which of its photos (with captions) go out. Only those
   photos appear — in friends' feed for that day, and on your profile
   calendar. Finalizing without sharing any photos is a first-class
   choice, not a failure state.

This staging is what lets people "update as they move through their day
and reflect later": capture is instant and uncurated, publishing is
slow and curated, and the two never blur.

## The entry gate — the home screen

The home screen is not a feed. It's a peaceful, nearly empty screen:

- If you **haven't finalized today's entry**: the screen shows almost
  nothing — one button, **Add entry for today**, and one small button
  (bottom corner) to your *own* calendar/archive. Friends' content is
  locked until you've done your entry. Not as punishment: the app is a
  journal first, and the social part is what you get *after* reflecting.
  You can always reach your own past days — your archive is never held
  hostage.
- Once you **finalize today**: the app opens up. Home becomes your
  calendar — each day's cover is its main photo if it has one, or a dot
  marking "text only" — and the Friends tab unlocks.

### Making the gate kind, not coercive (design risks to solve)

- **Define "entry" generously.** Writing something counts. Finalizing a
  photos-only day counts. Marking a deliberate *rest day* counts. If only
  real writing unlocks the app, people will type junk to get in, and the
  journal becomes a toll booth.
- **No streak shaming.** A missed day is just an empty day on the
  calendar, fillable later. No broken chains, no red marks.
- **Late is fine.** Finalizing yesterday (or last week) works exactly
  like finalizing today; friends see it in that day's place, not as a
  "late post".

## The social surface (after the gate)

- **Friends feed (a tab):** today's finalized photos from your friends,
  grouped by friend → day, chronological, no algorithm, no ads. Tap a
  friend's day to see their shared photos + captions for that day.
  Missed days are catch-up-able, but visually separated: **Today** is its
  own section at the top, and earlier missed days live below under a
  clear **Catch up** divider, so "now" never blurs into "backlog".
- **Friend profile = their calendar**, scrolled month by month, same
  cover language as yours: photo cover where they shared one, nothing
  where they didn't. (A text-only day shows *nothing* on a friend's
  calendar — the dot is private information, since it reveals they
  wrote.)
- **Engagement:** likes/comments on shared photos only — details later.
  Lean anti-pressure: chronological feed, no follower counts, no public
  like leaderboards.
- **Web is the deep end, mobile is the daily habit.** Primarily a mobile
  app (capture tray, the peaceful home, the evening finalize), with a
  fully built-out web version for serious journaling: long-form writing,
  search through years of entries, export/backup, annual reviews,
  vacation albums. Same account, same days, same rules.

## Data model sketch (extends what already exists)

```
Day   { userId, date, status: collecting | reflected | finalized,
        text (PRIVATE — never serialized into any shared view),
        coverPhotoId, finalizedAt }
Photo { id, dayId, caption, visibility: private | friends | public,
        stagedAt, publishedAt | null }
```

The current repo version already stores `caption` and `visibility` on
every photo and keeps text separate — the fields above mostly add the
Day `status`, which is the gate's state.

## Roadmap ideas that plug into this

- **Daily reminder** to do your diary-ing (the finalize moment is the
  natural time to nudge).
- **Calendar sync + prompts:** prompt what to write/add based on the
  user's real calendar for the day — mechanics TBD.
- **Vacation mode:** a multi-day Day-range — upload for a block, shown
  on the calendar as one connected block, opened like a single day.
  Fits "collecting" naturally: the tray just spans several days.

## Decisions (Catherine, 2026-11-13)

1. **Photos-only counts.** Finalizing does not require text — a
   photos-only day is a real entry (and so is a deliberate rest day).
2. **Edit / unpublish after finalizing: yes.** A finalized day can be
   reopened, edited, and unpublished. (Time limits, if any, TBD.)
3. **Friends feed allows catch-up**, with a clear visual separation
   between Today and previous missed days (see Friends feed above).
4. Both design tweaks accepted: generous definition of "entry" with no
   streak shaming, and no marker at all on a friend's calendar for
   text-only days.

## Open questions (parked, decide later)

1. Default visibility when finalizing: all-private with opt-ins per
   photo (assumed), or remember last time's choices?
2. What exactly do likes/comments look like so they stay friendly
   rather than performative? — explicitly deferred.
