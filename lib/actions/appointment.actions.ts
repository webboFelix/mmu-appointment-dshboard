"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";

//mag:  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    // const scheduledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "scheduled");

    // const pendingAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "pending");

    // const cancelledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "cancelled");

    // const data = {
    //   totalCount: appointments.total,
    //   scheduledCount: scheduledAppointments.length,
    //   pendingCount: pendingAppointments.length,
    //   cancelledCount: cancelledAppointments.length,
    //   documents: appointments.documents,
    // };

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
      (acc, appointment) => {
        switch (appointment.status) {
          case "scheduled":
            acc.scheduledCount++;
            break;
          case "pending":
            acc.pendingCount++;
            break;
          case "cancelled":
            acc.cancelledCount++;
            break;
        }
        return acc;
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
  }
};

//  SEND EMAIL NOTIFICATION
export const sendEmailNotification = async (
  userId: string,
  subject: string,
  content: string
) => {
  try {
    const message = await messaging.createEmail(
      ID.unique(),
      subject,
      content,
      [], // CC
      [userId] // Recipients
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending email:", error);
  }
};

//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw Error;

    const scheduleTime = formatDateTime(
      appointment.schedule!,
      timeZone
    ).dateTime;

    // 🔹 Subject based on appointment type
    const subject =
      type === "schedule"
        ? "Your Appointment is Confirmed - MMU Dispensary"
        : "Your Appointment has been Cancelled - MMU Dispensary";

    // 🔹 Email content message
    const emailMessage = `
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px;">
      
      <h2 style="color: #10b981; text-align: center;">MMU Dispensary</h2>

      <img 
        src="http://localhost:3000/gifs/mmu.gif" 
        alt="MMU Dispensary Banner" 
        style="display: block; margin: 0 auto 20px auto; max-width: 100%; border-radius: 6px;"
      />

      <p style="font-size: 16px;">Dear Valued Patient,</p>

      <p style="font-size: 16px;">
        ${
          type === "schedule"
            ? `We are pleased to inform you that your appointment has been <strong>successfully scheduled</strong> for <strong>${scheduleTime}</strong> with Dr. <strong>${appointment.primaryPhysician}</strong>.`
            : `We regret to inform you that your appointment originally scheduled for <strong>${scheduleTime}</strong> has been <strong>cancelled</strong>.<br/><br/>Reason: <em>${appointment.cancellationReason}</em>.`
        }
      </p>

      <hr style="margin: 30px 0;" />

      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        MMU Dispensary is committed to offering high-quality, compassionate care to the university community. 
        Our services include general consultations, chronic illness management, preventive screenings, 
        vaccination programs, reproductive health support, and mental wellness services.
        <br/><br/>
        We aim to ensure your health and wellbeing are always a priority through accessible and professional medical services.
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Warm regards,<br/>
        <strong>MMU Dispensary Team</strong><br/>
        <em>Your Health, Our Priority.</em>
      </p>

    </div>
  </div>
`;

    await sendEmailNotification(userId, subject, emailMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while scheduling an appointment:", error);
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};
