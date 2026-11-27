Deno.serve((request) => {
  const booking = new URL(request.url).searchParams.get("booking") || "";
  if (!/^[0-9a-f-]{36}$/.test(booking)) {
    return new Response("Invalid booking", { status: 400 });
  }
  // Supabase's standard function domain cannot serve HTML. A fixed deep-link
  // redirect returns to the installed app without claiming that payment succeeded.
  return new Response(null, {
    status: 302,
    headers: {
      Location: `motorrentalexpo://bookings/${booking}`,
      "Cache-Control": "no-store",
    },
  });
});
