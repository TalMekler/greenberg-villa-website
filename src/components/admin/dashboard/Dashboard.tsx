import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hasConflict, stayDateKeys } from "../../../data/availability";
import { useInquiries } from "../../../hooks/useInquiries";
import { useLiveReload } from "../../../hooks/useLiveReload";
import { useSiteImages } from "../../../hooks/useSiteImages";
import { useVillaLocation } from "../../../hooks/useVillaLocation";
import { ApiError, deleteInquiry, logout, setInquiryStatus } from "../../../lib/api";
import { fromDateKey, nightsBetween } from "../../../lib/date";
import {
  formatMoney,
  priceBreakdown,
  type Currency,
  type InquiryStatus,
} from "../../../lib/inquiry";
import type { SiteImages } from "../../../lib/site-images";
import type { VillaLocation } from "../../../lib/location";
import type { AdminUser } from "../../../lib/user";
import { BookingPriceForm } from "../BookingPriceForm";
import { LocationPanel } from "../LocationPanel";
import { ChangePasswordForm } from "../auth";
import { ImagesPanel } from "../images";
import { StatsPanel } from "../stats";
import { UsersPanel } from "../users";
import { actionButton } from "../shared";
import { StatusPill } from "./StatusPill";
import { StayCell } from "./StayCell";
import { SummaryTile } from "./SummaryTile";

const filters = ["all", "pending", "approved", "declined", "cancelled"] as const;
type Filter = (typeof filters)[number];

/** Everything an authenticated admin sees. */
export function Dashboard({
  user,
  onSignedOut,
  onAccountChanged,
}: {
  user: AdminUser;
  onSignedOut: () => void;
  onAccountChanged: () => void;
}) {
  const { inquiries, loading, error, unauthorized, reload } = useInquiries();
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const { images: siteImages, error: imagesError, reload: reloadImages } = useSiteImages();
  const [imagesOverride, setImagesOverride] = useState<SiteImages | null>(null);
  const { location, error: locationError, reload: reloadLocation } = useVillaLocation();
  const [locationOverride, setLocationOverride] = useState<VillaLocation | null>(null);
  const images = imagesOverride ?? siteImages;

  /*
    Everything here arrives over the socket, including new inquiries.

    That table cannot be watched directly — the browser may not read guests'
    names and emails, and an admin session here is this app's own rather than
    Supabase's, so there is no way to tell an admin's browser from anyone
    else's. `inquiry_pulse` stands in for it: a single row a trigger bumps on
    any change, carrying a counter and a timestamp and nothing else. Hearing it
    move is the cue to re-fetch through the authenticated API.
  */
  useLiveReload(["site_images"], reloadImages);
  useLiveReload(["location"], reloadLocation);
  useLiveReload(["booked_dates", "inquiry_pulse"], reload);

  // Session lapsed mid-session — hand control back to the sign-in screen.
  useEffect(() => {
    if (unauthorized) onSignedOut();
  }, [unauthorized, onSignedOut]);

  const changeStatus = async (id: string, status: InquiryStatus) => {
    setBusyId(id);
    setActionError(null);
    try {
      await setInquiryStatus(id, status);
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onSignedOut();
        return;
      }
      setActionError(caught instanceof Error ? caught.message : "That change did not go through.");
    } finally {
      setBusyId(null);
    }
  };

  /** Erases a cancelled inquiry. Two steps, because nothing brings it back. */
  const removeInquiry = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await deleteInquiry(id);
      setPendingDelete(null);
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onSignedOut();
        return;
      }
      setActionError(caught instanceof Error ? caught.message : "That deletion did not go through.");
    } finally {
      setBusyId(null);
    }
  };

  const bookings = useMemo(
    () => inquiries.filter((inquiry) => inquiry.status === "approved"),
    [inquiries],
  );

  const pendingCount = inquiries.filter((inquiry) => inquiry.status === "pending").length;

  // Totals per currency — mixing them into one number would be meaningless.
  const revenue = useMemo(() => {
    const totals = new Map<Currency, number>();
    bookings.forEach((booking) => {
      if (!booking.price) return;
      const nights = nightsBetween(fromDateKey(booking.checkIn), fromDateKey(booking.checkOut));
      const { total } = priceBreakdown(booking.price, nights);
      totals.set(booking.price.currency, (totals.get(booking.price.currency) ?? 0) + total);
    });
    return [...totals.entries()];
  }, [bookings]);

  const unpriced = bookings.filter((booking) => !booking.price).length;

  const nightsBooked = bookings.reduce(
    (total, booking) => total + stayDateKeys(booking.checkIn, booking.checkOut).length - 1,
    0,
  );

  const visible = useMemo(
    () => (filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter)),
    [inquiries, filter],
  );

  return (
    <div className="min-h-dvh bg-shell">
      <header className="bg-navy px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-serif text-[22px] text-white">Green Villa</p>
            <p className="font-sans text-[12px] tracking-[0.08em] text-cream uppercase">
              Booking admin
            </p>
            <p className="mt-1 font-sans text-[12px] break-all text-cream/70">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-[4px] border border-cream/40 px-4 py-2 font-sans text-[12px] font-bold tracking-[0.04em] text-cream uppercase transition-colors hover:bg-white/10"
            >
              View site
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout().then(onSignedOut);
              }}
              className="rounded-[4px] bg-white/10 px-4 py-2 font-sans text-[12px] font-bold tracking-[0.04em] text-cream uppercase transition-colors hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-5 py-10 sm:px-8 lg:px-12">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-terracotta bg-terracotta/10 px-4 py-3">
            <p role="alert" className="font-sans text-[13px] text-ink">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void reload()}
              className={`${actionButton} bg-navy text-white hover:bg-[#16304d]`}
            >
              Retry
            </button>
          </div>
        ) : null}

        {actionError ? (
          <p role="alert" className="font-sans text-[13px] text-terracotta">
            {actionError}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile label="Total inquiries" value={inquiries.length} />
          <SummaryTile label="Awaiting review" value={pendingCount} />
          <SummaryTile label="Confirmed bookings" value={bookings.length} />
          <SummaryTile label="Nights booked" value={nightsBooked} />
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="font-serif text-[28px] text-navy">Statistics</h2>
          <StatsPanel inquiries={inquiries} />
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-[28px] text-navy">Inquiries</h2>
            <div className="flex flex-wrap gap-2">
              {filters.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={`rounded-full px-4 py-1.5 font-sans text-[12px] font-bold tracking-[0.04em] uppercase transition-colors ${
                    filter === option
                      ? "bg-navy text-white"
                      : "bg-sand text-slate hover:bg-cream"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-line bg-white p-8 text-center font-sans text-[14px] text-slate">
              {loading
                ? "Loading inquiries…"
                : inquiries.length === 0
                  ? "No inquiries yet. Submit the contact form on the site and it will appear here."
                  : `No ${filter} inquiries.`}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
              <table className="w-full min-w-[880px] border-collapse text-left font-sans text-[14px]">
                <thead>
                  <tr className="border-b border-line bg-sand">
                    {["Guest", "Stay", "Message", "Received", "Status", "Actions"].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        className="px-4 py-3 font-sans text-[11px] font-bold tracking-[0.08em] text-slate uppercase"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inquiry) => {
                    const conflict = hasConflict(inquiry, inquiries);
                    return (
                      <tr key={inquiry.id} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-ink">
                              {inquiry.firstName} {inquiry.lastName}
                            </span>
                            <a
                              href={`mailto:${inquiry.email}`}
                              className="text-[12px] text-slate underline-offset-2 hover:underline"
                            >
                              {inquiry.email}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StayCell inquiry={inquiry} />
                        </td>
                        <td className="max-w-[280px] px-4 py-4 align-top text-[13px] text-slate">
                          {inquiry.message || <span className="opacity-50">—</span>}
                        </td>
                        <td className="px-4 py-4 align-top text-[13px] whitespace-nowrap text-slate">
                          {new Date(inquiry.submittedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill status={inquiry.status} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          {inquiry.status === "pending" ? (
                            <div className="flex flex-col items-start gap-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={conflict || busyId === inquiry.id}
                                  onClick={() => void changeStatus(inquiry.id, "approved")}
                                  title={
                                    conflict ? "These dates overlap a confirmed booking" : undefined
                                  }
                                  className={`${actionButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void changeStatus(inquiry.id, "declined")}
                                  disabled={busyId === inquiry.id}
                                  className={`${actionButton} border border-line text-slate hover:bg-sand`}
                                >
                                  Decline
                                </button>
                              </div>
                              {conflict ? (
                                <span className="text-[11px] text-terracotta">
                                  Overlaps dates already taken
                                </span>
                              ) : null}
                            </div>
                          ) : inquiry.status === "cancelled" ? (
                            pendingDelete === inquiry.id ? (
                              <div className="flex flex-col items-start gap-2">
                                <span className="font-sans text-[12px] text-slate">
                                  Delete permanently?
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={busyId === inquiry.id}
                                    onClick={() => void removeInquiry(inquiry.id)}
                                    className={`${actionButton} bg-terracotta text-white hover:bg-[#b96b4f]`}
                                  >
                                    Yes, delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDelete(null)}
                                    className={`${actionButton} border border-line text-slate hover:bg-sand`}
                                  >
                                    Keep
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDelete(inquiry.id)}
                                className={`${actionButton} border border-line text-slate hover:border-terracotta hover:text-terracotta`}
                              >
                                Delete
                              </button>
                            )
                          ) : (
                            <span className="text-[12px] text-slate opacity-60">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-[28px] text-navy">Bookings</h2>
          <p className="font-sans text-[13px] text-slate">
            Confirmed stays. These dates show as booked in the availability calendar; cancelling one
            releases them.
          </p>

          {revenue.length > 0 ? (
            <p className="font-sans text-[14px] text-ink">
              Booked revenue:{" "}
              {revenue.map(([currency, total], index) => (
                <span key={currency}>
                  {index > 0 ? " · " : ""}
                  <span className="font-bold">{formatMoney(total, currency)}</span>
                </span>
              ))}
              {unpriced > 0 ? (
                <span className="text-slate">
                  {" "}
                  ({unpriced} {unpriced === 1 ? "booking" : "bookings"} not priced yet)
                </span>
              ) : null}
            </p>
          ) : null}

          {bookings.length === 0 ? (
            <p className="rounded-lg border border-line bg-white p-8 text-center font-sans text-[14px] text-slate">
              No confirmed bookings yet — approve an inquiry above.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-col rounded-lg border border-line bg-white p-6 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-2 font-sans text-[14px]">
                    <span className="font-semibold text-ink">
                      {booking.firstName} {booking.lastName}
                    </span>
                    <StayCell inquiry={booking} />
                  </div>

                  {pendingCancel === booking.id ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-sans text-[12px] text-slate">Release these dates?</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void changeStatus(booking.id, "cancelled");
                            setPendingCancel(null);
                          }}
                          className={`${actionButton} bg-terracotta text-white hover:bg-[#b96b4f]`}
                        >
                          Yes, cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingCancel(null)}
                          className={`${actionButton} border border-line text-slate hover:bg-sand`}
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingCancel(booking.id)}
                      className={`${actionButton} border border-terracotta text-terracotta hover:bg-terracotta hover:text-white`}
                    >
                      Cancel booking
                    </button>
                  )}
                  </div>

                  <BookingPriceForm
                    booking={booking}
                    nights={nightsBetween(
                      fromDateKey(booking.checkIn),
                      fromDateKey(booking.checkOut),
                    )}
                    onSaved={reload}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-6 border-t border-line pt-10">
          <h2 className="font-serif text-[28px] text-navy">Site photos</h2>
          <p className="font-sans text-[13px] text-slate">
            The hero image and the gallery on the public page. Changes are live immediately.
          </p>

          <div className="rounded-lg border border-line bg-white p-6 shadow-card">
            {imagesError ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p role="alert" className="font-sans text-[13px] text-terracotta">
                  {imagesError}
                </p>
                <button
                  type="button"
                  onClick={() => void reloadImages()}
                  className={`${actionButton} bg-navy text-white hover:bg-[#16304d]`}
                >
                  Retry
                </button>
              </div>
            ) : images ? (
              <ImagesPanel images={images} onChanged={setImagesOverride} />
            ) : (
              <p className="font-sans text-[14px] text-slate">Loading photos…</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6 border-t border-line pt-10">
          <h2 className="font-serif text-[28px] text-navy">Map location</h2>
          <p className="font-sans text-[13px] text-slate">
            Where the map in the location section is centred, and where the pin sits.
          </p>

          <div className="rounded-lg border border-line bg-white p-6 shadow-card">
            {locationError ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p role="alert" className="font-sans text-[13px] text-terracotta">
                  {locationError}
                </p>
                <button
                  type="button"
                  onClick={() => void reloadLocation()}
                  className={`${actionButton} bg-navy text-white hover:bg-[#16304d]`}
                >
                  Retry
                </button>
              </div>
            ) : (
              <LocationPanel
                location={locationOverride ?? location}
                onSaved={setLocationOverride}
              />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6 border-t border-line pt-10">
          <h2 className="font-serif text-[28px] text-navy">Account &amp; access</h2>

          <div className="rounded-lg border border-line bg-white p-6 shadow-card">
            <h3 className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
              Your password
            </h3>
            <p className="mt-2 mb-5 font-sans text-[13px] text-slate">
              Changing it signs out your other sessions.
            </p>
            {passwordChanged ? (
              <p role="status" className="mb-5 font-sans text-[13px] text-navy">
                Password updated.
              </p>
            ) : null}
            <ChangePasswordForm
              variant="settings"
              onChanged={() => {
                setPasswordChanged(true);
                onAccountChanged();
              }}
            />
          </div>

          <div className="rounded-lg border border-line bg-white p-6 shadow-card">
            <UsersPanel currentUserId={user.id} />
          </div>
        </section>
      </main>
    </div>
  );
}
