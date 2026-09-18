import type { ReactNode } from "react";
import { accessibilityCoordinator } from "../../data/accessibility";
import { hasEmail, hasPhone, operator, telHref } from "../../data/operator";
import type { Dictionary } from "../../i18n";
import { WithPlaceholders } from "./Placeholder";

const linkClass =
  "text-terracotta-deep underline underline-offset-2 transition-colors hover:text-navy";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-semibold text-navy">{label}</dt>
      <dd className="mb-2 break-words text-ink last:mb-0 sm:mb-0">{children}</dd>
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border border-line bg-sand p-5 font-sans text-[16px] sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-y-3">
      {children}
    </dl>
  );
}

/** A mailto: link once the address is real; the highlighted placeholder until then. */
function Email({ value }: { value: string }) {
  return hasEmail(value) ? (
    <a href={`mailto:${value}`} dir="ltr" className={linkClass}>
      {value}
    </a>
  ) : (
    <WithPlaceholders text={value} />
  );
}

function Phone({ value }: { value: string }) {
  return hasPhone(value) ? (
    <a href={telHref(value)} dir="ltr" className={linkClass}>
      {value}
    </a>
  ) : (
    <WithPlaceholders text={value} />
  );
}

/** Who runs the villa and how to reach them, as the legal pages quote it. */
export function OperatorContact({ t }: { t: Dictionary }) {
  return (
    <Card>
      <Row label={t.legal.operatedBy}>
        <WithPlaceholders text={operator.name} />
      </Row>
      <Row label={t.legal.address}>
        <WithPlaceholders text={operator.address} />
      </Row>
      <Row label={t.legal.email}>
        <Email value={operator.email} />
      </Row>
      <Row label={t.legal.phone}>
        <Phone value={operator.phone} />
      </Row>
      <Row label={t.legal.ama}>
        <WithPlaceholders text={operator.ama} />
      </Row>
    </Card>
  );
}

/** The accessibility coordinator, as the accessibility statement names them. */
export function CoordinatorContact({ t }: { t: Dictionary }) {
  return (
    <Card>
      <Row label={t.legal.coordinator}>
        <WithPlaceholders text={accessibilityCoordinator.name} />
      </Row>
      <Row label={t.legal.email}>
        <Email value={accessibilityCoordinator.email} />
      </Row>
      <Row label={t.legal.phone}>
        <Phone value={accessibilityCoordinator.phone} />
      </Row>
    </Card>
  );
}
