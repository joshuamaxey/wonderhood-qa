import { expect, test, type Page } from "@playwright/test";
import { loginWithTestUser } from "../../../utils/helpers/auth";

type EditableEventFields = {
  name: string;
  description: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  limit: string;
  ageMin: string;
  ageMax: string;
  city: string;
  address: string;
  zipCode: string;
  latitude: string;
  longitude: string;
};

const eventEditData = {
  adminEmail: process.env.EVENT_EDIT_ADMIN_EMAIL,
  adminPassword: process.env.EVENT_EDIT_ADMIN_PASSWORD || process.env.DEFAULT_PASS,
};

for (const [key, value] of Object.entries(eventEditData)) {
  expect(value, `Missing required event edit environment variable: ${key}`).toBeTruthy();
}

const elementaryEventPath = "/events/69f14aabf73338139ad13e29";
const elementaryEventEditPath = `${elementaryEventPath}/updateEvent`;

const baselineEvent: EditableEventFields = {
  name: "Elementary Homeschool Field Day",
  description:
    "Join us for FREE sporting events, snacks, and t-shirt souvenirs! There will be competitive events with ribbon awards starting at 11:!5am on May 26th. Hope to see you there!",
  notes: "Outdoor games and group activities for homeschool families.",
  date: "2027-06-27",
  startTime: "10:00",
  endTime: "12:00",
  limit: "20",
  ageMin: "5",
  ageMax: "12",
  city: "Westcliffe",
  address: "401 S. 3rd Street",
  zipCode: "81252",
  latitude: "38.1347",
  longitude: "-105.4667",
};

const editedEvent: EditableEventFields = {
  name: "Elementary Smoke Edited Field Day",
  description:
    "Smoke test update: families rotate through cooperative games, relay stations, and field activities.",
  notes: "Smoke test note: bring water, athletic shoes, and sun protection.",
  date: "2027-06-28",
  startTime: "09:15",
  endTime: "11:45",
  limit: "21",
  ageMin: "6",
  ageMax: "13",
  city: "Denver",
  address: "123 Smoke Test Way",
  zipCode: "81818",
  latitude: "39.7392",
  longitude: "-104.9903",
};

function eventField(page: Page, name: keyof EditableEventFields) {
  return page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
}

async function openElementaryEventEditPage(page: Page) {
  await page.goto(elementaryEventEditPath);
  await expect(page.getByRole("heading", { name: /update event/i })).toBeVisible();
}

async function fillEditableEventFields(page: Page, event: EditableEventFields) {
  await eventField(page, "name").fill(event.name);
  await eventField(page, "description").fill(event.description);
  await eventField(page, "notes").fill(event.notes);
  await eventField(page, "date").fill(event.date);
  await eventField(page, "startTime").fill(event.startTime);
  await eventField(page, "endTime").fill(event.endTime);
  await eventField(page, "limit").fill(event.limit);
  await eventField(page, "ageMin").fill(event.ageMin);
  await eventField(page, "ageMax").fill(event.ageMax);
  await eventField(page, "city").selectOption(event.city);
  await eventField(page, "address").fill(event.address);
  await eventField(page, "zipCode").fill(event.zipCode);
  await eventField(page, "latitude").fill(event.latitude);
  await eventField(page, "longitude").fill(event.longitude);
}

async function expectEditableEventFields(page: Page, event: EditableEventFields) {
  await expect(eventField(page, "name")).toHaveValue(event.name);
  await expect(eventField(page, "description")).toHaveValue(event.description);
  await expect(eventField(page, "notes")).toHaveValue(event.notes);
  await expect(eventField(page, "date")).toHaveValue(event.date);
  await expect(eventField(page, "startTime")).toHaveValue(event.startTime);
  await expect(eventField(page, "endTime")).toHaveValue(event.endTime);
  await expect(eventField(page, "limit")).toHaveValue(event.limit);
  await expect(eventField(page, "ageMin")).toHaveValue(event.ageMin);
  await expect(eventField(page, "ageMax")).toHaveValue(event.ageMax);
  await expect(eventField(page, "city")).toHaveValue(event.city);
  await expect(eventField(page, "address")).toHaveValue(event.address);
  await expect(eventField(page, "zipCode")).toHaveValue(event.zipCode);
  await expect(eventField(page, "latitude")).toHaveValue(event.latitude);
  await expect(eventField(page, "longitude")).toHaveValue(event.longitude);
}

async function submitEventEdit(page: Page) {
  await page.getByRole("button", { name: /^edit event$/i }).click();
  await expect(page).toHaveURL(new RegExp(`${elementaryEventPath}$`));
}

async function restoreElementaryEventBaseline(page: Page) {
  await openElementaryEventEditPage(page);
  await fillEditableEventFields(page, baselineEvent);
  await expectEditableEventFields(page, baselineEvent);
  await submitEventEdit(page);
}

async function expectEditedEventDetail(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: /elementary smoke edited field day in denver/i }),
  ).toBeVisible();
  await expect(page.getByText(editedEvent.description)).toBeVisible();
  await expect(page.getByText(editedEvent.notes)).toBeVisible();
  await expect(page.getByText(/0 of 21 enrolled/i)).toBeVisible();
  await expect(page.getByText(/21 spots left/i)).toBeVisible();
  await expect(page.getByText(/jun\s*28\s*2027/i)).toBeVisible();
  await expect(page.getByText(/9:15 am\s*–\s*11:45 am/i).first()).toBeVisible();
  await expect(page.getByText(editedEvent.address)).toBeVisible();
  await expect(page.getByText(/denver,\s*co\s*81818/i)).toBeVisible();
  await expect(page.getByText(/6–13 yrs/i)).toBeVisible();
}

async function expectBaselineEventDetail(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: /elementary homeschool field day in westcliffe/i }),
  ).toBeVisible();
  await expect(page.getByText(baselineEvent.description)).toBeVisible();
  await expect(page.getByText(baselineEvent.notes)).toBeVisible();
  await expect(page.getByText(/0 of 20 enrolled/i)).toBeVisible();
  await expect(page.getByText(/20 spots left/i)).toBeVisible();
  await expect(page.getByText(/jun\s*27\s*2027/i)).toBeVisible();
  await expect(page.getByText(/10:00 am\s*–\s*12:00 pm/i).first()).toBeVisible();
  await expect(page.getByText(baselineEvent.address)).toBeVisible();
  await expect(page.getByText(/westcliffe,\s*co\s*81252/i)).toBeVisible();
  await expect(page.getByText(/5–12 yrs/i)).toBeVisible();
}

test("admin edits and restores Elementary Homeschool Field Day event details", async ({ page }) => {
  // Configuration: navigate to the homepage, sign in as an admin, and restore the target event to its baseline values.
  await page.goto("/");
  await loginWithTestUser(page, {
    email: eventEditData.adminEmail,
    password: eventEditData.adminPassword,
  });
  await restoreElementaryEventBaseline(page);
  await expectBaselineEventDetail(page);

  try {
    // Behavior: open the event edit page and update low-risk editable event fields.
    await openElementaryEventEditPage(page);
    await fillEditableEventFields(page, editedEvent);

    // Assertion: the edit form retains the updated values before saving.
    await expectEditableEventFields(page, editedEvent);

    // Behavior: save the edited event details.
    await submitEventEdit(page);

    // Assertion: the event detail page reflects the edited content, schedule, capacity, ages, and location.
    await expectEditedEventDetail(page);
  } finally {
    // Configuration: restore the event to its baseline values so the smoke flow remains repeatable.
    await restoreElementaryEventBaseline(page);
  }

  // Assertion: the event detail page reflects the restored baseline values.
  await expectBaselineEventDetail(page);
});
