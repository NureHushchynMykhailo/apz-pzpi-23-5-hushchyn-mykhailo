/*Write a complete C# program that implements the Strategy Design Pattern for a payment system by first defining an interface named IPaymentStrategy with a single method Pay that accepts a decimal amount.
Create two concrete implementation classes: CreditCardPayment, which takes a string cardNumber in its constructor and prints a message about deducting the amount from that card, and PayPalPayment, which takes an email string in its constructor and prints a message about paying via that email.
Additionally, implement a ShoppingCart class that maintains a private IPaymentStrategy reference and includes a SetPaymentStrategy method to switch strategies at runtime, as well as a Checkout method that executes the payment only if a strategy is set, otherwise printing an error. 
Finally, provide a Program class with a Main method that instantiates the ShoppingCart, first uses a CreditCardPayment for 500 units, then switches to a PayPalPayment for 750 units, ensuring that all financial calculations use the decimal type and the code adheres to clean coding standards.*/


using System;

public interface IPaymentStrategy
{
    void Pay(decimal amount);
}

public class CreditCardPayment : IPaymentStrategy
{
    private string _cardNumber;

    public CreditCardPayment(string cardNumber)
    {
        _cardNumber = cardNumber;
    }

    public void Pay(decimal amount)
    {
        Console.WriteLine($"Списано {amount} грн з карти {_cardNumber}");
    }
}

public class PayPalPayment : IPaymentStrategy
{
    private string _email;

    public PayPalPayment(string email)
    {
        _email = email;
    }

    public void Pay(decimal amount)
    {
        Console.WriteLine($"Оплачено {amount} грн через PayPal: {_email}");
    }
}

public class ShoppingCart
{
    private IPaymentStrategy _paymentStrategy;

    public void SetPaymentStrategy(IPaymentStrategy strategy)
    {
        _paymentStrategy = strategy;
    }

    public void Checkout(decimal amount)
    {
        if (_paymentStrategy != null)
        {
            _paymentStrategy.Pay(amount);
        }
        else
        {
            Console.WriteLine("Стратегія оплати не встановлена!");
        }
    }
}

class Program
{
    static void Main()
    {
        ShoppingCart cart = new ShoppingCart();

        IPaymentStrategy cardPayment = new CreditCardPayment("1234-5678-9012-3456");
        cart.SetPaymentStrategy(cardPayment);
        cart.Checkout(500);

        IPaymentStrategy paypalPayment = new PayPalPayment("user@example.com");
        cart.SetPaymentStrategy(paypalPayment);
        cart.Checkout(750);
    }
}



